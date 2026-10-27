/**
 * JS.QUIZZ — backend & API
 * ---------------------------------------------------------------
 *  POST /api/login        { name, email }  → session (token, user,
 *                          the 10 fixed PPT questions + 10 fresh
 *                          AI-engine questions seeded per login)
 *  GET  /api/quiz/:token  → stored session questions (resume support)
 *  POST /api/submit       { token, answers, totalTimeMs } → scored
 *                          result + leaderboard (server-authoritative)
 *  GET  /api/leaderboard  → top attempts
 *  GET  /api/health       → liveness probe
 *
 * In production (after `npm run build`) this server also serves the
 * compiled frontend from /dist — one process, one origin, one port.
 */
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FOUNDATION } from "../src/lib/engine/foundation.mjs";
import { generateDynamicSet } from "../src/lib/engine/generator.mjs";
import { loadDB, saveDB, pruneSessions, pruneAttempts } from "./store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);

const app = express();
app.disable("x-powered-by");

/* CORS — the standalone JS.QUIZZ.html (opened via file://) calls this API
   cross-origin. Local quiz app, so open access is correct here. */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: "256kb" }));

const db = loadDB();
pruneSessions(db);
pruneAttempts(db);
saveDB(db);

const TOTAL = FOUNDATION.length + 10;

function publicAttempt(a, rank) {
  return { rank, id: a.id, name: a.name, score: a.score, total: a.total, accuracy: a.accuracy, timeMs: a.timeMs, at: a.at };
}

function leaderboard() {
  const sorted = [...db.attempts].sort(
    (a, b) => b.score - a.score || a.timeMs - b.timeMs || b.at - a.at
  );
  return sorted.slice(0, 10).map((a, i) => publicAttempt(a, i + 1));
}

const api = express.Router();

api.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), attempts: db.attempts.length });
});

/* ---------------------------------------------------------------- */
/* LOGIN — accepts ANY name and ANY email-style input.               */
/* A new seed is minted on every login → a fresh AI question set.    */
/* ---------------------------------------------------------------- */
api.post("/login", (req, res) => {
  try {
    /* Accept the details EXACTLY as the user typed them. Empty fields get
       friendly defaults instead of errors — login can never be rejected. */
    const name = String(req.body?.name ?? "").trim().slice(0, 60) || "GUEST";
    const email = String(req.body?.email ?? "").trim().slice(0, 120).toLowerCase() || "guest@local";
    const now = Date.now();
    const seed = crypto.randomInt(0, 2 ** 31);
    const token = crypto.randomUUID();

    const prev = db.users[email];
    db.users[email] = {
      name,
      email,
      createdAt: prev?.createdAt ?? now,
      logins: (prev?.logins ?? 0) + 1,
      lastLogin: now,
      lastSeed: seed,
    };

    const dynamic = generateDynamicSet(seed);

    db.sessions[token] = {
      token,
      email,
      name,
      seed,
      createdAt: now,
      dynamic,
      submitted: false,
      result: null,
    };
    pruneSessions(db);
    saveDB(db);

    res.json({
      token,
      seed,
      user: { name, email, logins: db.users[email].logins },
      foundation: FOUNDATION,
      dynamic,
    });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "LOGIN_FAILED", message: "Unexpected server error." });
  }
});

/* ---------------------------------------------------------------- */
/* SESSION RESUME — return the stored questions for a token.         */
/* ---------------------------------------------------------------- */
api.get("/quiz/:token", (req, res) => {
  try {
    const s = db.sessions[req.params.token];
    if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND", message: "This session expired — log in again." });
    res.json({
      token: s.token,
      seed: s.seed,
      user: { name: s.name, email: s.email },
      foundation: FOUNDATION,
      dynamic: s.dynamic,
      submitted: s.submitted,
    });
  } catch (err) {
    console.error("[quiz]", err);
    res.status(500).json({ error: "QUIZ_FAILED", message: "Unexpected server error." });
  }
});

/* ---------------------------------------------------------------- */
/* SUBMIT — the server re-scores everything from its own stored       */
/* question sets (never trusts client-side correctness flags).       */
/* Idempotent: re-submitting a token returns the stored result.      */
/* ---------------------------------------------------------------- */
api.post("/submit", (req, res) => {
  try {
    const token = String(req.body?.token ?? "");
    const s = db.sessions[token];
    if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND", message: "Unknown session — log in again." });

    if (s.submitted && s.result) {
      return res.json({ ...s.result, leaderboard: leaderboard(), idempotent: true });
    }

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const totalTimeMs = Math.max(0, Number(req.body?.totalTimeMs) || 0);

    const all = [...FOUNDATION, ...s.dynamic];
    const byId = new Map(answers.map((a) => [String(a?.qid), Number(a?.choice)]));

    let score = 0;
    const phase = { foundation: { correct: 0, total: 0 }, dynamic: { correct: 0, total: 0 } };
    for (const q of all) {
      const bucket = q.kind === "foundation" ? phase.foundation : phase.dynamic;
      bucket.total++;
      const choice = byId.get(q.id);
      if (choice === q.answerIndex) {
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

    const now = Date.now();
    const attempt = {
      id: crypto.randomUUID(),
      token,
      name: s.name,
      email: s.email,
      score,
      total: TOTAL,
      accuracy,
      timeMs: totalTimeMs,
      at: now,
    };
    db.attempts.push(attempt);
    pruneAttempts(db);

    s.submitted = true;
    s.result = { score, total: TOTAL, accuracy, grade, phase, timeMs: totalTimeMs, attemptId: attempt.id };
    pruneSessions(db);
    saveDB(db);

    res.json({ ...s.result, leaderboard: leaderboard() });
  } catch (err) {
    console.error("[submit]", err);
    res.status(500).json({ error: "SUBMIT_FAILED", message: "Unexpected server error." });
  }
});

api.get("/leaderboard", (_req, res) => {
  res.json({ leaderboard: leaderboard() });
});

app.use("/api", api);

/* Production: serve the built SPA from /dist (checked per-request, so a
   build that lands after boot is picked up without a restart). */
const dist = path.join(__dirname, "..", "dist");
app.use(express.static(dist));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  const index = path.join(dist, "index.html");
  if (!fs.existsSync(index)) {
    return res.status(503).send("Frontend not built yet — run `npm run build`.");
  }
  res.sendFile(index);
});

/* 404 for unknown API routes, then a final error handler. */
app.use("/api", (_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Unknown API route." }));
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "INTERNAL", message: "Unexpected server error." });
});

/* Listen on every interface so a phone on the same Wi-Fi can open
   http://<PC-IP>:4000 directly in its browser. */
function lanIPs() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === "IPv4" && !ni.internal) ips.push(ni.address);
    }
  }
  return ips;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[JS.QUIZZ] API server ready  → http://localhost:${PORT}`);
  for (const ip of lanIPs()) {
    console.log(`[JS.QUIZZ] on your PHONE     → http://${ip}:${PORT}   (same Wi-Fi as this PC)`);
  }
});
