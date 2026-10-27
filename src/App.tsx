import { useCallback, useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import QuizPage, { type QuizChip } from "./pages/QuizPage";
import ResultsPage, { type RoundRec } from "./pages/ResultsPage";
import CertificatePage from "./pages/CertificatePage";
import { login as apiLogin, submitQuiz, withTimeout } from "./lib/api";
import { offlineSession } from "./lib/local";
import { installTapSound } from "./lib/sounds";
import { generateDynamicSet } from "./lib/engine/generator.mjs";
import type { Answer, LoginResponse, Question, SubmitResult } from "./types";

type Phase = "login" | "quiz" | "review" | "certificate";

const SESSION_KEY = "jsquizz/game";

/** Everything needed to resume the run after a refresh — works offline too. */
type Game = {
  session: LoginResponse;
  /** 0 = the 20-question opener, 1+ = added 10-question AI rounds. */
  batchNo: number;
  /** Seeds of every generated round (display + determinism). */
  seeds: number[];
  /** Completed rounds with their answers. */
  batches: RoundRec[];
  /** The round currently being played (null while on the review deck). */
  currentBatch: Question[] | null;
  allTimeMs: number;
  /** Result of the base 20-question run when the server scored it. */
  serverResult: SubmitResult | null;
  phase: "quiz" | "review";
};

/** Same 31-bit range as the server's crypto.randomInt(0, 2**31). */
function randomSeed(): number {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    return c.getRandomValues(new Uint32Array(1))[0] >>> 1;
  }
  return Math.floor(Math.random() * 2 ** 31);
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("login");
  const [restoring, setRestoring] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);

  const save = useCallback((g: Game | null) => {
    try {
      if (g) sessionStorage.setItem(SESSION_KEY, JSON.stringify(g));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage full/unavailable — non-fatal */
    }
  }, []);

  /* Quick tap tick on every button press, site-wide (mobile-app feel). */
  useEffect(() => {
    installTapSound();
  }, []);

  /* Resume an un-finished run after a page refresh. The cache carries its
     own questions, so this works with the backend running OR fully offline. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const g = raw ? (JSON.parse(raw) as Game) : null;
      if (g?.session?.token && Array.isArray(g.session.foundation)) {
        setGame(g);
        setPhase(g.phase === "review" || !g.currentBatch ? "review" : "quiz");
      } else if (raw) {
        save(null);
      }
    } catch {
      save(null);
    }
    setRestoring(false);
  }, [save]);

  /* Persist on every game change. */
  useEffect(() => {
    if (game) save(game);
  }, [game, save]);

  const startSession = useCallback(
    (s: LoginResponse) => {
      const g: Game = {
        session: s,
        batchNo: 0,
        seeds: [s.seed],
        batches: [],
        currentBatch: [...s.foundation, ...s.dynamic],
        allTimeMs: 0,
        serverResult: null,
        phase: "quiz",
      };
      setGame(g);
      save(g);
      setPhase("quiz");
    },
    [save]
  );

  /* ENTER — accepts ANY name + ANY email, backend or not. The quiz server is
     tried for a few seconds; when it doesn't answer, the login is minted
     straight from the built-in engine. Never an error. */
  const doLogin = useCallback(
    async (name: string, email: string) => {
      setBusy(true);
      try {
        let s: LoginResponse | null = null;
        try {
          s = await withTimeout(apiLogin(name, email), 3000);
        } catch {
          s = null; // no backend answering — go offline, silently
        }
        startSession(s ?? offlineSession(name, email));
      } finally {
        setBusy(false);
      }
    },
    [startSession]
  );

  /* A batch is finished: keep it, maybe sync the base run to the server,
     then land on the review deck. The backend is optional end-to-end. */
  const finishBatch = useCallback(
    async (answers: Answer[], timeMs: number) => {
      if (!game) return;
      setBusy(true);
      let serverResult = game.serverResult;
      if (game.batchNo === 0 && !serverResult && !game.session.offline) {
        try {
          serverResult = await withTimeout(submitQuiz(game.session.token, answers, timeMs), 4000);
        } catch {
          serverResult = null; // server gone / session expired — score locally
        }
      }
      const rec: RoundRec = { questions: game.currentBatch ?? [], answers, timeMs };
      const next: Game = {
        ...game,
        batches: [...game.batches, rec],
        currentBatch: null,
        allTimeMs: game.allTimeMs + timeMs,
        serverResult,
        phase: "review",
      };
      setGame(next);
      save(next);
      setBusy(false);
      setPhase("review");
    },
    [game, save]
  );

  /* ADD 10 NEW QUESTIONS — a brand-new seed forges a brand-new set: fresh
     topics, fresh values, fresh variable names, fresh option order. */
  const addRound = useCallback(() => {
    if (!game) return;
    const seed = randomSeed();
    const next: Game = {
      ...game,
      batchNo: game.batchNo + 1,
      seeds: [...game.seeds, seed],
      currentBatch: generateDynamicSet(seed),
      phase: "quiz",
    };
    setGame(next);
    save(next);
    setPhase("quiz");
  }, [game, save]);

  const handleRetry = useCallback(() => {
    if (!game) return;
    void doLogin(game.session.user.name, game.session.user.email);
  }, [game, doLogin]);

  const handleLogout = useCallback(() => {
    save(null);
    setGame(null);
    setPhase("login");
  }, [save]);

  /* ---- derived totals for the running displays ---- */
  const answered = game ? game.batches.flatMap((r) => r.answers) : [];
  const carryScore = answered.filter((a) => a.correct).length;
  const certNo = game
    ? `JSQ-${game.session.token.replace(/-/g, "").slice(0, 8).toUpperCase()}-${answered.length}`
    : "";

  if (restoring) {
    return (
      <main className="app">
        <header className="topbar">
          <div className="logo">
            JS<span className="dot">.</span>QUIZZ<span className="cursor">_</span>
          </div>
        </header>
        <div style={{ padding: 40, font: "700 15px var(--mono)" }}>LOADING THE PIT...</div>
      </main>
    );
  }

  if (phase === "quiz" && game?.currentBatch) {
    const b = game.batchNo;
    const title =
      b === 0
        ? "PHASE 1 + 2 · FOUNDATION & AI ENGINE"
        : `ROUND ${b + 1} · AI ENGINE — BRAND-NEW SET`;
    const chips: QuizChip[] =
      b === 0
        ? [
            { text: "CORE BASICS", cls: "acid" },
            { text: "SAME 10 · EVERY TIME" },
            { text: "AI ENGINE v2", cls: "cyan" },
            { text: `SEED #${game.seeds[0] ?? game.session.seed}` },
          ]
        : [
            { text: "10 FRESH QUESTIONS", cls: "acid" },
            { text: "NEW VALUES · NEW WORLDS" },
            { text: "AI ENGINE v2", cls: "cyan" },
            { text: `SEED #${game.seeds[b]}` },
          ];
    return (
      <QuizPage
        key={`${game.session.token}-b${b}`}
        questions={game.currentBatch}
        userName={game.session.user.name}
        carryScore={carryScore}
        phaseTitle={title}
        chips={chips}
        storeKey={`jsquizz/progress/${game.session.token}/b${b}`}
        onFinish={finishBatch}
        onQuit={handleLogout}
      />
    );
  }

  if (phase === "review" && game) {
    return (
      <ResultsPage
        user={game.session.user}
        rounds={game.batches}
        serverResult={game.serverResult}
        onAddRound={addRound}
        onCertificate={() => setPhase("certificate")}
        onRetry={handleRetry}
        onLogout={handleLogout}
        busy={busy}
      />
    );
  }

  if (phase === "certificate" && game) {
    const allQ = game.batches.flatMap((r) => r.questions);
    const allA = game.batches.flatMap((r) => r.answers);
    const correct = allA.filter((a) => a.correct).length;
    return (
      <CertificatePage
        user={game.session.user}
        correct={correct}
        total={allQ.length}
        accuracy={Math.round((correct / Math.max(1, allQ.length)) * 100)}
        timeMs={game.allTimeMs}
        rounds={game.batches.length}
        certNo={certNo}
        onBack={() => setPhase("review")}
      />
    );
  }

  return <LoginPage onLogin={doLogin} busy={busy} />;
}
