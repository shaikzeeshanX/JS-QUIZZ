/**
 * make-stickers.mjs — turns JPEG artwork on a dark background into
 * transparent "die-cut" sticker PNGs.
 *
 * Pipeline:
 *   1. decode to raw RGBA
 *   2. flood-fill the background from the image borders (all pixels whose
 *      brightness stays under T_STOP) → those become fully transparent
 *   3. feather the alpha edge (box blur) so the remaining glow fades softly
 *   4. optional glow cut / morphological closing / small-fragment cleanup
 *   5. optional flat recolor — yellow body + black letters (classic JS sticker)
 *   6. white die-cut outline, trim, save
 *
 * Usage:
 *   node scripts/make-stickers.mjs <in.jpg> <out.png> [--extract=x,y,w,h]
 *        [--tstop=110] [--feather=3] [--glowcut=0] [--close=0]
 *        [--keepbig=0] [--outline=0] [--recolor=gold|w2b]
 */
import sharp from "sharp";

const args = process.argv.slice(2);
const inFile = args[0];
const outFile = args[1];
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};
if (!inFile || !outFile) {
  console.error("usage: node scripts/make-stickers.mjs <in> <out> [--extract=x,y,w,h] [--tstop=110] [--feather=3] [--outline=6] ...");
  process.exit(1);
}

const T_STOP = Number(opt("tstop", 110));
const FEATHER = Number(opt("feather", 3));

let img = sharp(inFile).rotate();
const extractRaw = opt("extract", null);
if (extractRaw) {
  const [left, top, width, height] = extractRaw.split(",").map(Number);
  if ([left, top, width, height].every((n) => Number.isFinite(n) && n >= 0)) {
    img = img.extract({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) });
  }
}

const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const channels = info.channels; // 4 after ensureAlpha

/* brightness = max(r,g,b) — catches saturated glow colours, ignores dark bg */
const lum = new Uint8Array(W * H);
for (let i = 0, p = 0; i < W * H; i++, p += channels) {
  lum[i] = Math.max(data[p], data[p + 1], data[p + 2]);
}

/* 2 — flood fill background from every border pixel */
const bg = new Uint8Array(W * H);
const queue = new Int32Array(W * H);
let qStart = 0, qEnd = 0;
const tryPush = (i) => {
  if (!bg[i] && lum[i] < T_STOP) {
    bg[i] = 1;
    queue[qEnd++] = i;
  }
};
for (let x = 0; x < W; x++) { tryPush(x); tryPush((H - 1) * W + x); }
for (let y = 0; y < H; y++) { tryPush(y * W); tryPush(y * W + W - 1); }
while (qStart < qEnd) {
  const i = queue[qStart++];
  const x = i % W, y = (i / W) | 0;
  if (x > 0) tryPush(i - 1);
  if (x < W - 1) tryPush(i + 1);
  if (y > 0) tryPush(i - W);
  if (y < H - 1) tryPush(i + W);
}

/* 3 — alpha with feathered edge */
let alpha = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) alpha[i] = bg[i] ? 0 : 1;

const boxBlur = (src, radius) => {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  const span = radius * 2 + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -radius; x <= radius; x++) acc += src[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / span;
      const add = src[y * W + Math.min(W - 1, x + radius + 1)];
      const sub = src[y * W + Math.max(0, x - radius)];
      acc += add - sub;
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / span;
      const add = tmp[Math.min(H - 1, y + radius + 1) * W + x];
      const sub = tmp[Math.max(0, y - radius) * W + x];
      acc += add - sub;
    }
  }
  return out;
};
for (let pass = 0; pass < 2; pass++) alpha = boxBlur(alpha, FEATHER);

/* speckle guard — only kills near-black pixels that touch the removed
   background; dark artwork interiors (black brush strokes etc.) survive */
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (bg[i] || lum[i] >= 14) continue;
    let nearBg = false;
    for (let dy = -1; dy <= 1 && !nearBg; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy;
        const xx = x + dx;
        if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
        if (bg[yy * W + xx]) {
          nearBg = true;
          break;
        }
      }
    }
    if (nearBg) alpha[i] = Math.min(alpha[i], 0.15);
  }
}

/* optional glow cut — drop the faint outer glow entirely for a tight sticker */
const GLOWCUT = Number(opt("glowcut", 0));
if (GLOWCUT > 0) {
  for (let i = 0; i < W * H; i++) {
    if (alpha[i] < GLOWCUT) alpha[i] = 0;
  }
}

/* optional morphological closing — bridges narrow gaps that the flood fill
   ate with solid fill (the artwork's own dark negative space) */
const CLOSE = Number(opt("close", 0));
if (CLOSE > 0) {
  const morph = (src, set) => {
    const o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let v = set ? 0 : 1;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = Math.min(H - 1, Math.max(0, y + dy));
            const xx = Math.min(W - 1, Math.max(0, x + dx));
            const s = src[yy * W + xx];
            if (set) v = Math.max(v, s);
            else v = Math.min(v, s);
          }
        }
        o[y * W + x] = v;
      }
    }
    return o;
  };
  let m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = alpha[i] > 0.3 ? 1 : 0;
  let d = m;
  for (let it = 0; it < CLOSE; it++) d = morph(d, true);
  for (let it = 0; it < CLOSE; it++) d = morph(d, false);
  /* filled gap pixels become fully opaque (their colour is the artwork's black) */
  for (let i = 0; i < W * H; i++) {
    if (d[i] && alpha[i] <= 0.3) alpha[i] = 1;
  }
}

/* optional small-fragment drop — keep only components ≥ keepbig × largest */
const KEEPBIG = Number(opt("keepbig", 0));
if (KEEPBIG > 0) {
  const label = new Int32Array(W * H).fill(-1);
  const areas = [];
  const queue2 = new Int32Array(W * H);
  for (let seed = 0; seed < W * H; seed++) {
    if (label[seed] !== -1 || alpha[seed] <= 0.04) continue;
    const id = areas.length;
    let qS = 0, qE = 0, area = 0;
    label[seed] = id;
    queue2[qE++] = seed;
    while (qS < qE) {
      const i = queue2[qS++];
      area++;
      const x = i % W;
      const y = (i / W) | 0;
      const push = (j) => {
        if (label[j] === -1 && alpha[j] > 0.04) {
          label[j] = id;
          queue2[qE++] = j;
        }
      };
      if (x > 0) push(i - 1);
      if (x < W - 1) push(i + 1);
      if (y > 0) push(i - W);
      if (y < H - 1) push(i + W);
    }
    areas.push(area);
  }
  if (areas.length) {
    const biggest = Math.max(...areas);
    for (let i = 0; i < W * H; i++) {
      if (alpha[i] > 0.04 && areas[label[i]] < KEEPBIG * biggest) alpha[i] = 0;
    }
  }
}

/* 4 — trim to content bbox (alpha > 0.04) with padding */
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (alpha[y * W + x] > 0.04) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const pad = 10;
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
const cw = maxX - minX + 1;
const ch = maxY - minY + 1;

const out = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const si = (y + minY) * W + (x + minX);
    const sp = si * channels;
    const dp = (y * cw + x) * 4;
    out[dp] = data[sp];
    out[dp + 1] = data[sp + 1];
    out[dp + 2] = data[sp + 2];
    out[dp + 3] = Math.round(Math.max(0, Math.min(1, alpha[si])) * 255);
  }
}

/* optional flat recolor — classic JS sticker: yellow body, black letters.
   gold = dark areas → yellow, bright areas → black (cube, dark square)
   w2b  = keep yellows/darks, white/silver → black (emblem, grunge square) */
const RECOLOR = opt("recolor", null);
if (RECOLOR === "gold" || RECOLOR === "w2b") {
  const YELLOW = [0xf7, 0xdf, 0x1e];
  const INK = [0x11, 0x11, 0x11];
  for (let i = 0; i < cw * ch; i++) {
    const p = i * 4;
    if (out[p + 3] < 40) continue;
    const r = out[p];
    const g = out[p + 1];
    const b = out[p + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const sat = mx - mn;
    let toBlack = false;
    let toYellow = false;
    if (RECOLOR === "gold") {
      if (mx >= 110) toBlack = true;
      else toYellow = true;
    } else if (mx >= 140 && sat < 70) {
      toBlack = true;
    }
    if (toBlack) {
      out[p] = INK[0];
      out[p + 1] = INK[1];
      out[p + 2] = INK[2];
    } else if (toYellow) {
      out[p] = YELLOW[0];
      out[p + 1] = YELLOW[1];
      out[p + 2] = YELLOW[2];
    }
  }
}

/* optional white die-cut outline around the visible content */
const OUTLINE = Number(opt("outline", 0));
if (OUTLINE > 0) {
  let mask = new Float32Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) mask[i] = out[i * 4 + 3] > 38 ? 1 : 0;
  for (let it = 0; it < OUTLINE; it++) {
    const nm = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        let v = 0;
        for (let dy = -1; dy <= 1 && !v; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy < 0 || yy >= ch || xx < 0 || xx >= cw) continue;
            if (mask[yy * cw + xx]) {
              v = 1;
              break;
            }
          }
        }
        nm[y * cw + x] = v;
      }
    }
    mask = nm;
  }
  for (let i = 0; i < cw * ch; i++) {
    if (mask[i] && out[i * 4 + 3] <= 38) {
      out[i * 4] = 255;
      out[i * 4 + 1] = 255;
      out[i * 4 + 2] = 255;
      out[i * 4 + 3] = 255;
    }
  }
}

await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
  .png({ compressionLevel: 9, palette: true, quality: 92, effort: 8 })
  .toFile(outFile);

console.log(`✓ ${outFile} — ${cw}x${ch} (tstop=${T_STOP}, feather=${FEATHER})`);
