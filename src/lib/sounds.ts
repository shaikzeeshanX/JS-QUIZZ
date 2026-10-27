/* Native Web-Audio sound effects — no audio files, works offline.
   One shared AudioContext, created lazily inside the first user gesture
   (clicking an option), so autoplay policies are satisfied. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number
): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** bright rising arpeggio — "you got it" */
export function playCorrect(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 523.25, t, 0.14, "triangle", 0.22); // C5
  tone(c, 659.25, t + 0.09, 0.14, "triangle", 0.22); // E5
  tone(c, 783.99, t + 0.18, 0.3, "triangle", 0.24); // G5
  tone(c, 1046.5, t + 0.18, 0.3, "sine", 0.1); // C6 sparkle
}

/** quick soft tick — mobile-app-style feedback for every button press */
export function playTap(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 2600, t, 0.045, "triangle", 0.09);
  tone(c, 3900, t, 0.028, "sine", 0.045);
}

/* Installed once from App: every button press site-wide gets the tap tick.
   Quiz option cells are skipped — they fire the big correct/wrong sounds. */
let tapInstalled = false;
export function installTapSound(): void {
  if (tapInstalled || typeof document === "undefined") return;
  tapInstalled = true;
  document.addEventListener(
    "pointerdown",
    (e) => {
      const t = e.target as Element | null;
      if (!t || typeof t.closest !== "function") return;
      if (t.closest(".option-cell")) return;
      if (t.closest("button, [role='button']")) playTap();
    },
    { capture: true, passive: true }
  );
}

/** harsh descending buzz — "nope" */
export function playWrong(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(82, t + 0.32);
  f.type = "lowpass";
  f.frequency.setValueAtTime(1200, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.36);
  /* low thud under the buzz */
  tone(c, 110, t, 0.25, "square", 0.12);
}
