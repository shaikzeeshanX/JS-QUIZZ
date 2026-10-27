import type { Answer, LeaderRow, LoginResponse, SubmitResult } from "../types";

declare global {
  interface Window {
    /** LAN API addresses baked in at build time by scripts/make-standalone.mjs.
     *  A phone opening the standalone file can't use "localhost" (that would be
     *  the phone itself) — so it falls back to the PC's real network address. */
    __QUIZZ_API_CANDIDATES__?: string[];
  }
}

/* Candidate API bases, tried in order until one answers:
   - served by the API server (:4000) or Vite dev (:5173) → relative /api
   - opened as a standalone file (or any other host) → localhost:4000, then
     the PC's LAN IP(s) baked in at build time. */
function candidateBases(): string[] {
  const list: string[] = [];
  const port = typeof location !== "undefined" ? location.port : "";
  if (port === "5173" || port === "4000") list.push("/api");
  list.push("http://localhost:4000/api");
  const baked = typeof window !== "undefined" ? window.__QUIZZ_API_CANDIDATES__ : undefined;
  if (Array.isArray(baked)) {
    for (const b of baked) if (b && !list.includes(b)) list.push(b);
  }
  return list;
}

export const CANDIDATES = candidateBases();

/** Human-facing server URLs (for the offline hints). */
export const SERVER_URLS = [...new Set(CANDIDATES.filter((b) => b.startsWith("http")).map((b) => b.replace(/\/api$/, "")))];

/** The address of the quiz server on the local network (for phone hints). */
export const LAN_URL = SERVER_URLS.find((u) => !u.includes("localhost"));

export const NETWORK_HINT = [
  "CAN'T REACH THE QUIZ SERVER YET.",
  "On the PC: double-click START-JS.QUIZZ.bat (or run npm start).",
  LAN_URL ? `On a phone: open ${LAN_URL} in this browser — same Wi-Fi as the PC.` : "",
]
  .filter(Boolean)
  .join(" ");

/** The base currently in use — sticky once a candidate has answered. */
let activeBase = CANDIDATES[0];
export function getApiBase(): string {
  return activeBase;
}

export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /fetch|network|load failed|aborted/i.test(msg);
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** One attempt against one base. Any HTTP response (even 4xx/5xx) means the
 *  server was found — stick with that base and surface its message. Only
 *  transport failures (connection refused etc.) fall through to the next
 *  candidate. */
async function attempt<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  activeBase = base;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const err = body as { error?: string; message?: string } | null;
    throw new HttpError(res.status, err?.message || err?.error || `Request failed (HTTP ${res.status})`);
  }
  return body as T;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  /* Try the sticky base first, then every other candidate. */
  const order = [activeBase, ...CANDIDATES.filter((b) => b !== activeBase)];
  let lastError: unknown = null;
  for (const base of order) {
    try {
      return await attempt<T>(base, path, init);
    } catch (e) {
      if (e instanceof HttpError) throw e; // server answered — real error
      lastError = e; // unreachable — try the next candidate
    }
  }
  throw lastError ?? new Error("Network error");
}

export async function checkHealth(perBaseTimeoutMs = 2000): Promise<boolean> {
  for (const base of CANDIDATES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), perBaseTimeoutMs);
    try {
      const res = await fetch(`${base}/health`, { signal: ctrl.signal });
      if (res.ok) {
        activeBase = base;
        return true;
      }
    } catch {
      /* try the next candidate */
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

export function login(name: string, email: string) {
  return call<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify({ name, email }),
  });
}

/** Reject with a "timeout" error if `p` hasn't settled within `ms`. Both the
 *  timeout and the underlying promise's rejections are always handled — no
 *  unhandled-rejection noise in the console. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export function fetchSession(token: string) {
  return call<LoginResponse & { submitted: boolean }>(`/quiz/${encodeURIComponent(token)}`);
}

export function submitQuiz(token: string, answers: Answer[], totalTimeMs: number) {
  return call<SubmitResult>("/submit", {
    method: "POST",
    body: JSON.stringify({ token, answers, totalTimeMs }),
  });
}

export type { LeaderRow };
