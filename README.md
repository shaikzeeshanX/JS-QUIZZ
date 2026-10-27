# JS.QUIZZ — Brutal JavaScript Quiz

A brutalism-themed JavaScript quiz: 10 fixed foundation questions + 10 fresh
machine-forged questions on every login, water-button options, slam actions,
sound effects, and an instant answer review under every question.

**It works with zero backend** — the whole question engine is built into the
frontend. A server is optional and only adds the shared leaderboard.

## 🚀 Easiest way to run (single HTML file)

1. Double-click **`START-JS.QUIZZ.bat`** — it starts the backend (optional,
   for the leaderboard) and opens **`JS.QUIZZ.html`** in your browser.
2. Or just double-click **`JS.QUIZZ.html`** alone — everything works offline.

`JS.QUIZZ.html` is a single self-contained file: the entire frontend (JS, CSS,
fonts and stickers embedded) plus the built-in question engine. Login accepts
ANY name + ANY email-style input (empty works too → GUEST). If the optional
backend isn't running, the page goes into offline mode silently — no banners,
no errors — and syncs to the leaderboard automatically whenever the server is
reachable.

On a phone: open `http://<PC-IP>:4000` (printed by the server on start), or
copy `JS.QUIZZ.html` to the phone — it auto-finds the PC on the same Wi-Fi.

Regenerate the file after code changes:

```bash
npm run standalone     # = vite build + node scripts/make-standalone.mjs
```

## 🌐 Deploy

**Full stack with leaderboard → [Render](https://render.com) (free):**

1. Push this repo to GitHub (see below).
2. Render → **New + → Blueprint** → pick the repo → Apply. Done —
   `render.yaml` builds the frontend and runs the API on one port.
   (Free tier: the JSON leaderboard resets on redeploy/restart, and the
   service sleeps when idle — the quiz itself never breaks; it just scores
   locally until the server wakes up.)

**Quiz only (solo, no leaderboard) → GitHub Pages (free):**

1. Push this repo to GitHub.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy-pages.yml`) builds and
   publishes the quiz on every push to `main`.

## The quiz

- **Login** — accepts ANY name + ANY email-style input (no passwords, no
  validation drama).
- **Phase 1** — the 10 FIXED foundation questions (`src/lib/engine/foundation.mjs`).
  Always the same, always in deck order.
- **Phase 2** — 10 questions forged by the seeded AI engine
  (`src/lib/engine/generator.mjs`), **changing on every login** (fresh random
  seed per session, deterministic per session).
- **Quick answer** — the correct answer + explanation slams in directly under
  each question (green review strip).
- **Reactions** — every answer slams a big ✔ CORRECT / ✘ WRONG stamp, flashes
  the screen and shakes the card, with distinct rising/descending sounds
  (pure Web Audio, offline-safe).
- **Water buttons** — every quiz option is a live water simulation; the water
  re-colours green (correct) / red (wrong).
- **Scoring** — server-authoritative when the backend is up, byte-identical
  local scoring otherwise (same grades: JS MASTER → BACK TO THE BASICS).

## Stack

- Frontend: React 18 + Vite + TypeScript + framer-motion
- Engine: shared ESM modules (`src/lib/engine/`) used by BOTH the browser and
  the server — one source of truth for questions
- Backend (optional): Node + Express, JSON-file storage (`server/data/db.json`)

## Run it (dev)

```bash
npm install
npm run dev
```

- Client → http://localhost:5173 (proxies /api)
- API    → http://localhost:4000

## Run it (production, single process)

```bash
npm run build
npm start        # serves /dist AND the API on http://localhost:4000
```

## API (optional — leaderboard service)

| Method | Route                | Purpose                                                |
| ------ | -------------------- | ------------------------------------------------------ |
| POST   | `/api/login`         | `{name, email}` → token, user, foundation + dynamic Qs |
| GET    | `/api/quiz/:token`   | Stored questions for a session (refresh-resume)        |
| POST   | `/api/submit`        | `{token, answers, totalTimeMs}` → score + leaderboard  |
| GET    | `/api/leaderboard`   | Top 10 attempts                                        |
| GET    | `/api/health`        | Liveness probe                                         |

## Push to GitHub

The folder just needs to become a git repo:

```powershell
git init
git add .
git commit -m "JS.QUIZZ — brutal JavaScript quiz"
git branch -M main
git remote add origin https://github.com/<YOU>/<REPO>.git
git push -u origin main
```

`node_modules`, build output and runtime data are already excluded via
`.gitignore`.

## Notes

- Node was installed as a portable runtime at `%LOCALAPPDATA%\Programs\nodejs`
  (not on system PATH). Prefix commands with:
  `$env:Path = "C:\Users\zeeshan\AppData\Local\Programs\nodejs;$env:Path"`
  (or use `npm.cmd` directly in PowerShell, since `npm.ps1` may be blocked by
  execution policy).
- Progress survives a page refresh (the session cache carries its own
  questions — works offline too).
- The water sim sleeps when calm — idle cost is near zero.
- The backend sends CORS headers, so `JS.QUIZZ.html` works from `file://`,
  any folder, or any host.
