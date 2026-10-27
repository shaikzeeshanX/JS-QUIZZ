import { useMemo, useState } from "react";
import SlamButton from "../components/SlamButton";
import Marquee from "../components/Marquee";
import type { Answer, LeaderRow, Question, SubmitResult, User } from "../types";

const LETTERS = ["A", "B", "C", "D"];

/** Questions answered across all rounds that unlock the certificate. */
export const CERT_THRESHOLD = 50;

/** One completed round of questions + how the player answered it. */
export type RoundRec = {
  questions: Question[];
  answers: Answer[];
  timeMs: number;
};

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Cumulative grade on any total (same spirit as the server's 20-question thresholds). */
export function gradeFor(correct: number, total: number): string {
  const p = total > 0 ? correct / total : 0;
  if (p >= 1) return "JS MASTER";
  if (p >= 0.8) return "SENIOR JS MONSTER";
  if (p >= 0.6) return "SOLID DEVELOPER";
  if (p >= 0.4) return "RISING CODER";
  return "BACK TO THE BASICS";
}

export default function ResultsPage({
  user,
  rounds,
  serverResult,
  onAddRound,
  onCertificate,
  onRetry,
  onLogout,
  busy,
}: {
  user: User;
  rounds: RoundRec[];
  /** Present only when the base 20-question run was scored by the server. */
  serverResult: SubmitResult | null;
  onAddRound: () => void;
  onCertificate: () => void;
  onRetry: () => void;
  onLogout: () => void;
  busy: boolean;
}) {
  /* Pair each question with its answer WITHIN its own round — generated
     rounds reuse ids (d1..d10), so a global lookup would cross rounds. */
  const pairs = useMemo(
    () =>
      rounds.flatMap((r, ri) =>
        r.questions.map((q) => ({
          q,
          round: ri + 1,
          a: r.answers.find((x) => x.qid === q.id),
        }))
      ),
    [rounds]
  );

  const total = pairs.length;
  const correct = pairs.filter((p) => p.a?.correct).length;
  const accuracy = Math.round((correct / Math.max(1, total)) * 100);
  const totalTime = rounds.reduce((n, r) => n + r.timeMs, 0);
  const grade = gradeFor(correct, total);
  const certReady = total >= CERT_THRESHOLD;

  const [openId, setOpenId] = useState<string | null>(null);

  const openQuestion = (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
    window.setTimeout(() => {
      document.getElementById(`rev-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="logo">
          JS<span className="dot">.</span>QUIZZ<span className="cursor">_</span>
        </div>
        <div className="userchip">
          <span className="chip acid">{user.name}</span>
          <span className="chip ink">{user.email}</span>
        </div>
      </header>
      <Marquee
        items={[
          "REVIEW DECK",
          `TOTAL ${correct}/${total}`,
          `ACCURACY ${accuracy}%`,
          certReady ? "CERTIFICATE UNLOCKED ★" : `${CERT_THRESHOLD - total} QUESTIONS TO THE CERTIFICATE`,
          "NO MERCY",
        ]}
      />

      <div className="results-grid">
        <section className="card shadow-acid">
          <span className="chip ink">RUNNING TOTAL — {rounds.length} ROUND{rounds.length === 1 ? "" : "S"}</span>
          <div className="score-huge">
            {correct}
            <span style={{ fontSize: "0.45em", color: "var(--red)" }}> / {total}</span>
          </div>
          <div className="stamp">{grade}</div>
          <div className="stats-row">
            <div className="stat-box">
              <b>{accuracy}%</b>
              <span>accuracy</span>
            </div>
            <div className="stat-box">
              <b>{fmtTime(totalTime)}</b>
              <span>total time</span>
            </div>
            {serverResult ? (
              <div className="stat-box">
                <b>
                  {serverResult.score}/{serverResult.total}
                </b>
                <span>base run · 20q</span>
              </div>
            ) : (
              <div className="stat-box">
                <b>OFFLINE</b>
                <span>solo scoring</span>
              </div>
            )}
            <div className="stat-box">
              <b>{total}</b>
              <span>answered</span>
            </div>
          </div>
          <div className="mastery">
            <span className="chip acid">HIT A BOX TO OPEN ITS REVIEW</span>
            <div className="mastery-bar" aria-label="one box per question">
              {pairs.map(({ q, a }) => {
                const good = a?.correct;
                return (
                  <i
                    key={`${rounds.length}-${q.id}`}
                    role="button"
                    tabIndex={0}
                    className={good ? "good" : "bad"}
                    title={`${good ? "correct" : "wrong"} — click to review`}
                    onClick={() => openQuestion(q.id)}
                    onKeyDown={(e) => e.key === "Enter" && openQuestion(q.id)}
                  />
                );
              })}
            </div>
            <div className="mastery-label">
              every box = 1 question · {CERT_THRESHOLD} answered unlocks your <b>CERTIFICATE OF SUCCESS</b>
            </div>
          </div>
          <div className="actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
            {certReady && (
              <SlamButton
                label="★ SEE YOUR CERTIFICATE"
                size={58}
                onClick={onCertificate}
                font={{ fontSize: 15 }}
              />
            )}
            <SlamButton
              label={busy ? "FORGING SET..." : "ADD 10 NEW QUESTIONS ▶"}
              size={58}
              onClick={onAddRound}
              font={{ fontSize: 15 }}
            />
            <button className="btn-static ghost" onClick={onRetry} disabled={busy}>
              RUN AGAIN
            </button>
            <button className="btn-static ghost" onClick={onLogout}>
              LOG OUT
            </button>
          </div>
        </section>

        {serverResult && (
          <section className="card shadow-red">
            <span className="chip red">GLOBAL LEADERBOARD · BASE RUN (20Q)</span>
            <table className="table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>NAME</th>
                  <th>SCORE</th>
                  <th>ACC</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {serverResult.leaderboard.map((row: LeaderRow) => (
                  <tr key={row.id} className={row.id === serverResult.attemptId ? "me" : ""}>
                    <td>{row.rank}</td>
                    <td>{row.name}</td>
                    <td>
                      {row.score}/{row.total}
                    </td>
                    <td>{row.accuracy}%</td>
                    <td>{fmtTime(row.timeMs)}</td>
                  </tr>
                ))}
                {serverResult.leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5}>NO RUNS YET — BE THE FIRST.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <section className="card" style={{ marginTop: 26 }}>
        <span className="chip cyan">FULL REVIEW — ALL {total} QUESTIONS · CLICK ONE FOR ITS EXPLANATION</span>
        <div className="review" style={{ marginTop: 16 }}>
          {pairs.map(({ q, a, round }, i) => {
            const good = a?.correct;
            const open = openId === q.id;
            return (
              <div key={`${round}-${q.id}`} id={`rev-${q.id}`} className="review-item">
                <button
                  type="button"
                  className={`review-q ${good ? "good" : "bad"} ${open ? "open" : ""}`}
                  onClick={() => setOpenId(open ? null : q.id)}
                >
                  <span className="mark">{good ? "✔" : "✘"}</span>
                  <span className="review-q-text">
                    <b>Q{i + 1}</b> [{q.kind === "foundation" ? "CORE" : `AI·R${round}`}] {q.topic} — {q.question}
                  </span>
                  <span className="chev">{open ? "▲" : "▼"}</span>
                </button>
                {open && a && (
                  <div className="review-detail">
                    {q.code && <pre className="codeblock">{q.code}</pre>}
                    <div className={`strip ${good ? "good" : ""}`}>
                      <div className="strip-top">
                        <span className="tag">{good ? "✔ CORRECT" : "✘ WRONG"}</span>
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
                        <span className={good ? "pick-good" : "pick-bad"}>
                          {LETTERS[a.choice]}) {q.options[a.choice]}
                        </span>
                      </div>
                      <div className="why">EXPLANATION // {q.explanation}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
