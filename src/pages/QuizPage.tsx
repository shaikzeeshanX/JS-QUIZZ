import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import WaterButton, { type WaterHandle } from "../components/WaterButton";
import SlamButton from "../components/SlamButton";
import { playCorrect, playWrong } from "../lib/sounds";
import type { Answer, Question } from "../types";

const LETTERS = ["A", "B", "C", "D"];

const WATER_GOOD = "#83AF9B";
const WATER_BAD = "#FE4365";
const WATER_DIM = "#C8C8A9";

/* Neon set for the idle option buttons — bright versions of the theme hues. */
const NEON = ["#FF3D68", "#3DFFB0", "#FFB35C", "#D9F15C"];

export type QuizChip = { text: string; cls?: string };

export default function QuizPage({
  questions,
  userName,
  carryScore,
  phaseTitle,
  chips,
  storeKey,
  onFinish,
  onQuit,
}: {
  /** The questions of THIS batch only (20 for the opener, 10 per added round). */
  questions: Question[];
  userName: string;
  /** Correct answers from earlier rounds — shown as the running total. */
  carryScore: number;
  phaseTitle: string;
  chips: QuizChip[];
  storeKey: string;
  onFinish: (answers: Answer[], totalTimeMs: number) => void;
  onQuit: () => void;
}) {
  const saved = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (!raw) return null;
      const p = JSON.parse(raw) as { idx: number; answers: (Answer | null)[]; elapsed: number };
      if (!Array.isArray(p?.answers) || p.answers.length !== questions.length) return null;
      return p;
    } catch {
      return null;
    }
  }, [storeKey, questions.length]);

  const [idx, setIdx] = useState(saved?.idx ?? 0);
  const [answers, setAnswers] = useState<(Answer | null)[]>(
    () => saved?.answers ?? new Array(questions.length).fill(null)
  );
  const [reaction, setReaction] = useState<{ ok: boolean; id: number } | null>(null);
  const shakeCtl = useAnimationControls();
  const elapsedRef = useRef<number>(saved?.elapsed ?? 0);
  const qStartRef = useRef<number>(Date.now());
  const optionRefs = useRef<(WaterHandle | null)[]>([]);

  const q = questions[idx];
  const answered = answers[idx] ?? null;
  const score = answers.reduce((n, a) => n + (a?.correct ? 1 : 0), 0);
  const streak = useMemo(() => {
    let s = 0;
    for (let i = idx - 1; i >= 0; i--) {
      if (answers[i]?.correct) s++;
      else break;
    }
    return s;
  }, [answers, idx]);

  /* Persist progress so a refresh never loses the run. */
  useEffect(() => {
    try {
      sessionStorage.setItem(
        storeKey,
        JSON.stringify({ idx, answers, elapsed: elapsedRef.current })
      );
    } catch {
      /* storage full/unavailable — non-fatal */
    }
  }, [idx, answers, storeKey]);

  /* Reset the per-question stopwatch on question change. */
  useEffect(() => {
    qStartRef.current = Date.now();
  }, [idx]);

  /* Fire the water celebration AFTER the water sim re-colours. */
  useEffect(() => {
    if (!answered) return;
    const raf = requestAnimationFrame(() => {
      optionRefs.current[q.answerIndex]?.celebrate(answered.correct ? 1.6 : 1.1);
      if (!answered.correct) {
        optionRefs.current[answered.choice]?.celebrate(0.6);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [answered, q]);

  /* Reaction auto-clears ~1s after each answer. */
  useEffect(() => {
    if (!reaction) return;
    const t = window.setTimeout(() => setReaction(null), 1000);
    return () => window.clearTimeout(t);
  }, [reaction]);

  const choose = useCallback(
    (choice: number) => {
      if (answers[idx]) return;
      const correct = choice === q.answerIndex;
      const timeMs = Date.now() - qStartRef.current;
      elapsedRef.current += timeMs;
      setAnswers((prev) => {
        const next = [...prev];
        next[idx] = { qid: q.id, choice, correct, timeMs };
        return next;
      });
      /* REACTION — fires on every answer: stamp slam + flash + shake + sound.
         right = one clean thump · wrong = violent rattle */
      setReaction({ ok: correct, id: Date.now() });
      shakeCtl.start(
        correct
          ? { x: [0, -7, 6, -3, 0], transition: { duration: 0.35, ease: "easeOut" } }
          : { x: [0, -14, 12, -9, 7, -4, 2, 0], transition: { duration: 0.5, ease: "easeInOut" } }
      );
      if (correct) playCorrect();
      else playWrong();
    },
    [answers, idx, q, shakeCtl]
  );

  const next = useCallback(() => {
    if (!answers[idx]) return;
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
    } else {
      try {
        sessionStorage.removeItem(storeKey);
      } catch {
        /* ignore */
      }
      const all = answers.filter((a): a is Answer => a !== null);
      onFinish(all, elapsedRef.current);
    }
  }, [answers, idx, questions.length, storeKey, onFinish]);

  function waterColorFor(i: number): string {
    if (!answered) return NEON[i % NEON.length];
    if (i === q.answerIndex) return WATER_GOOD;
    if (i === answered.choice) return WATER_BAD;
    return WATER_DIM;
  }

  /* Per-option visual skin: neon while idle, state colors once answered. */
  function optionSkin(i: number): { border: string; glow: string; rim: string } {
    if (!answered) {
      const n = NEON[i % NEON.length];
      return { border: n, glow: `0 0 18px ${n}66, 6px 6px 0 rgba(11, 11, 11, 0.9)`, rim: n };
    }
    if (i === q.answerIndex) {
      return { border: "var(--ink)", glow: `0 0 14px ${WATER_GOOD}88, 6px 6px 0 rgba(11, 11, 11, 0.9)`, rim: WATER_GOOD };
    }
    if (answered.choice === i) {
      return { border: "var(--ink)", glow: `0 0 14px ${WATER_BAD}88, 6px 6px 0 rgba(11, 11, 11, 0.9)`, rim: WATER_BAD };
    }
    return { border: "rgba(11, 11, 11, 0.35)", glow: "6px 6px 0 rgba(11, 11, 11, 0.35)", rim: "rgba(120, 120, 120, 0.5)" };
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="logo">
          JS<span className="dot">.</span>QUIZZ<span className="cursor">_</span>
        </div>
        <div className="userchip">
          <span className="chip acid">{userName}</span>
          <span className="chip ink">SCORE {carryScore + score}</span>
          {streak >= 2 && <span className="chip red">STREAK x{streak}</span>}
          <button className="chip" style={{ cursor: "pointer" }} onClick={onQuit} title="Quit to login">
            QUIT ✕
          </button>
        </div>
      </header>

      <div className="quiz-head">
        <div>
          <div className="phase-title">{phaseTitle}</div>
          <div className="qmeta" style={{ marginTop: 8 }}>
            {chips.map((c) => (
              <span key={c.text} className={c.cls ? `chip ${c.cls}` : "chip"}>
                {c.text}
              </span>
            ))}
          </div>
        </div>
        <div className="stat-row">
          <span className="chip ink">Q {String(idx + 1).padStart(2, "0")} / {questions.length}</span>
          <span className="chip mint">{score} CORRECT</span>
        </div>
      </div>

      <div className="progress">
        <i
          aria-hidden="true"
          style={{ width: `${((idx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
        <span className="qbar-label">
          Q{idx + 1} · {q.topic.toUpperCase()}
        </span>
      </div>

      <motion.div animate={shakeCtl}>
        <section className="card shadow-acid">
          <h2 className="qtext">{q.question}</h2>

        {/* QUICK REVIEW — appears under every single answer, with both exact answers */}
        {answered && (
          <div className={`strip ${answered.correct ? "good" : ""}`} role="status">
            <div className="strip-top">
              <span className="tag">{answered.correct ? "✔ CORRECT" : "✘ WRONG"}</span>
              <span className="answer-line">QUICK REVIEW</span>
            </div>
            <div className="review-line">
              <span className="rev-label">CORRECT ANSWER</span>
              <span>
                {LETTERS[q.answerIndex]}) {q.options[q.answerIndex]}
              </span>
            </div>
            <div className="review-line">
              <span className="rev-label">YOUR PICK</span>
              <span className={answered.correct ? "pick-good" : "pick-bad"}>
                {LETTERS[answered.choice]}) {q.options[answered.choice]}
              </span>
            </div>
            <div className="why">EXPLANATION // {q.explanation}</div>
          </div>
        )}

        {q.code && <pre className="codeblock">{q.code}</pre>}

        <div className="options">
          {q.options.map((opt, i) => {
            const skin = optionSkin(i);
            return (
              <div
                key={`${q.id}-${i}`}
                className={`option-cell ${answered ? "locked" : ""}`}
              >
                <WaterButton
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  label={`${LETTERS[i]})  ${opt}`}
                  onClick={() => choose(i)}
                  disabled={!!answered}
                  waterColor={waterColorFor(i)}
                  paddingX={22}
                  paddingY={15}
                  rounded={20}
                  glass={{ blur: 16, tint: answered ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.16)", frost: 14 }}
                  font={{
                    fontFamily: "'Arial Black', Arial, sans-serif",
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                  style={{
                    minHeight: 56,
                    maxWidth: "100%",
                    border: `4px solid ${skin.border}`,
                    borderRadius: 20,
                    boxShadow: skin.glow,
                  }}
                  borderOptions={{ color: skin.rim, stroke: 2 }}
                  shadow={false}
                />
              </div>
            );
          })}
        </div>

        <div className="quiz-footer">
          {answered ? (
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
              <SlamButton
                label={idx + 1 < questions.length ? "NEXT QUESTION ▶" : "FINISH ▶"}
                size={58}
                onClick={next}
                font={{ fontSize: 16 }}
              />
            </div>
          ) : (
            <span className="chip ink" title="Pick an option to unlock">
              ANSWER TO UNLOCK ▶
            </span>
          )}
        </div>

        {/* REACTION — stamp slams on every right and wrong answer */}
        <AnimatePresence>
          {reaction && (
            <motion.div
              key={reaction.id}
              className={`stamp-pop ${reaction.ok ? "good" : "bad"}`}
              initial={{ x: "-50%", y: "-50%", scale: 2.4, opacity: 0, rotate: reaction.ok ? -10 : 10 }}
              animate={{ x: "-50%", y: "-50%", scale: 1, opacity: 1, rotate: reaction.ok ? -7 : 7 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 650, damping: 20 }}
            >
              {reaction.ok ? "✔ CORRECT!" : "✘ WRONG!"}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      </motion.div>

      {/* REACTION — full-screen flash tint on every answer */}
      <AnimatePresence>
        {reaction && (
          <motion.div
            key={reaction.id}
            className={`flash-overlay ${reaction.ok ? "good" : "bad"}`}
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
