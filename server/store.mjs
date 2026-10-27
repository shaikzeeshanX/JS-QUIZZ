/**
 * Tiny JSON-file store with atomic writes.
 * Schema: { users: {}, sessions: {}, attempts: [] }
 * Zero dependencies, crash-safe (temp file + rename).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY = { users: {}, sessions: {}, attempts: [] };

export function loadDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveDB(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

/** Prune stale sessions so the file never grows unbounded. */
export function pruneSessions(db, maxSessions = 400, maxAgeMs = 7 * 24 * 3600 * 1000) {
  const entries = Object.entries(db.sessions);
  if (entries.length <= maxSessions) return;
  const cutoff = Date.now() - maxAgeMs;
  entries
    .filter(([, s]) => !s.createdAt || s.createdAt < cutoff)
    .forEach(([token]) => delete db.sessions[token]);
  // Hard cap by recency if still over.
  const keep = entries
    .filter(([token]) => db.sessions[token])
    .sort((a, b) => (b[1].createdAt ?? 0) - (a[1].createdAt ?? 0))
    .slice(0, maxSessions);
  db.sessions = Object.fromEntries(keep);
}

/** Keep the leaderboard list bounded. */
export function pruneAttempts(db, max = 500) {
  if (db.attempts.length > max) {
    db.attempts = db.attempts.slice(-max);
  }
}
