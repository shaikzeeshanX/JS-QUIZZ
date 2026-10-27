/**
 * local.ts — the quiz WITHOUT a backend.
 *
 * The login box mints sessions straight from the built-in engine when the
 * quiz server isn't answering (or at all): any details, instantly, offline.
 * Scoring mirrors the server's /submit logic 1:1 so results and grades are
 * identical in both modes.
 */
import { FOUNDATION } from "./engine/foundation.mjs";
import { generateDynamicSet } from "./engine/generator.mjs";
import type { Answer, LoginResponse, PhaseStat, SubmitResult } from "../types";

/** crypto.randomUUID only exists in secure contexts (file:// yes, a LAN
 *  http:// address no) — fall back to random bytes so phones never break. */
function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  if (c && typeof c.getRandomValues === "function") {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = [...b].map((n) => n.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `tok-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Build a session with the built-in engine — no network involved. */
export function offlineSession(name: string, email: string): LoginResponse {
  /* same 31-bit range as the server's crypto.randomInt(0, 2**31) */
  const seed = globalThis.crypto
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] >>> 1
    : Math.floor(Math.random() * 2 ** 31);
  return {
    token: uuid(),
    seed,
    user: { name, email },
    foundation: FOUNDATION,
    dynamic: generateDynamicSet(seed),
    offline: true,
  };
}

/** Score exactly like the server does: re-check every pick against the
 *  question's answerIndex, same phase buckets, same grade thresholds. */
export function scoreLocally(
  session: LoginResponse,
  answers: Answer[],
  totalTimeMs: number
): SubmitResult {
  const all = [...session.foundation, ...session.dynamic];
  const TOTAL = Math.max(1, all.length);
  const byId = new Map(answers.map((a) => [String(a?.qid), Number(a?.choice)]));

  let score = 0;
  const phase = { foundation: { correct: 0, total: 0 }, dynamic: { correct: 0, total: 0 } };
  for (const q of all) {
    const bucket = q.kind === "foundation" ? phase.foundation : phase.dynamic;
    bucket.total++;
    if (byId.get(q.id) === q.answerIndex) {
      score++;
      bucket.correct++;
    }
  }
  const accuracy = Math.round((score / TOTAL) * 100);
  const grade =
    score === TOTAL ? "JS MASTER" :
    score >= 16 ? "SENIOR JS MONSTER" :
    score >= 12 ? "SOLID DEVELOPER" :
    score >= 8 ? "RISING CODER" :
    "BACK TO THE BASICS";

  return {
    score,
    total: TOTAL,
    accuracy,
    grade,
    phase: phase as { foundation: PhaseStat; dynamic: PhaseStat },
    timeMs: Math.max(0, totalTimeMs),
    attemptId: uuid(),
    leaderboard: [],
  };
}
