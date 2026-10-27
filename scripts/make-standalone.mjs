/**
 * Builds JS.QUIZZ.html — ONE self-contained HTML file:
 *   ✔ the entire React frontend (JS bundle inlined as a module script)
 *   ✔ all CSS inlined
 *   ✔ all stickers embedded as base64 data URIs
 *   ✔ self-hosted fonts embedded as data URIs
 * It talks to the backend at http://localhost:4000 (start it with
 * START-JS.QUIZZ.bat or `npm start`).
 *
 * Usage: node scripts/make-standalone.mjs   (run `vite build` first,
 * or use `npm run standalone` which does both)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const outFile = path.join(root, "JS.QUIZZ.html");

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("✗ dist/index.html missing — run `npx vite build` first (or use `npm run standalone`).");
  process.exit(1);
}

let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");

/* 1 — inline the JS bundle */
const jsTag = /<script type="module"[^>]*src="([^"]+\.js)"[^>]*><\/script>/;
const jsMatch = html.match(jsTag);
if (!jsMatch) {
  console.error("✗ could not find the module script tag in dist/index.html");
  process.exit(1);
}
const jsFile = path.join(dist, jsMatch[1].replace(/^\//, "").split("?")[0]);
const jsCode = fs.readFileSync(jsFile, "utf8");
html = html.replace(jsTag, () => `<script type="module">\n${jsCode}\n</script>`);

/* 2 — inline the CSS */
const cssTag = /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/;
const cssMatch = html.match(cssTag);
if (cssMatch) {
  const cssFile = path.join(dist, cssMatch[1].replace(/^\//, "").split("?")[0]);
  const cssCode = fs.readFileSync(cssFile, "utf8");
  html = html.replace(cssTag, () => `<style>\n${cssCode}\n</style>`);
}

/* 3 — embed the images as data URIs (search the built dist/img folder) */
const imgDir = path.join(dist, "img");
if (fs.existsSync(imgDir)) {
  for (const name of fs.readdirSync(imgDir)) {
    const file = path.join(imgDir, name);
    if (!fs.statSync(file).isFile()) continue;
    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".png" ? "image/png" :
      ext === ".avif" ? "image/avif" :
      ext === ".webp" ? "image/webp" :
      ext === ".svg" ? "image/svg+xml" : null;
    if (!mime) continue;
    const dataUri = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    /* match both absolute (/img/x — old builds) and relative (img/x — sub-path safe) */
    for (const needle of [`/img/${name}`, `img/${name}`]) {
      while (html.includes(needle)) {
        html = html.replace(needle, dataUri);
      }
    }
  }
}

/* 3b — embed the self-hosted fonts as data URIs (offline typography) */
const fontDir = path.join(dist, "fonts");
if (fs.existsSync(fontDir)) {
  for (const name of fs.readdirSync(fontDir)) {
    const file = path.join(fontDir, name);
    if (!fs.statSync(file).isFile()) continue;
    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === ".woff2" ? "font/woff2" :
      ext === ".woff" ? "font/woff" :
      ext === ".ttf" ? "font/ttf" : null;
    if (!mime) continue;
    const dataUri = `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    const needle = `/fonts/${name}`;
    while (html.includes(needle)) {
      html = html.replace(needle, dataUri);
    }
  }
}

/* 4 — bake this PC's LAN API addresses into the file, so the SAME standalone
   file also works on other devices (a phone can't use "localhost" — that
   would be the phone itself). The app tries localhost first, then these. */
const lanIPs = [];
for (const list of Object.values(os.networkInterfaces())) {
  for (const ni of list ?? []) {
    if (ni.family === "IPv4" && !ni.internal) lanIPs.push(ni.address);
  }
}
const apiCandidates = ["http://localhost:4000/api", ...lanIPs.map((ip) => `http://${ip}:4000/api`)];
const inject = `<script>window.__QUIZZ_API_CANDIDATES__ = ${JSON.stringify(apiCandidates)};</script>`;
html = html.replace("<head>", `<head>\n  ${inject}`);
console.log(`✓ baked API candidates into JS.QUIZZ.html: ${apiCandidates.join(", ")}`);

fs.writeFileSync(outFile, html, "utf8");
const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
console.log(`✓ wrote JS.QUIZZ.html (${kb} KB) — double-click it with the server running.`);
