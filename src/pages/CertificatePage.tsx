import { useCallback } from "react";
import LightBloom from "../components/LightBloom";
import type { User } from "../types";
import "./../styles/certificate.css";

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function CertificatePage({
  user,
  correct,
  total,
  accuracy,
  timeMs,
  rounds,
  certNo,
  onBack,
}: {
  user: User;
  correct: number;
  total: number;
  accuracy: number;
  timeMs: number;
  rounds: number;
  certNo: string;
  onBack: () => void;
}) {
  const print = useCallback(() => window.print(), []);

  /* The exact name from the login box, printed as-is. Long names shrink to fit. */
  const name = (user.name || "GUEST").trim() || "GUEST";
  const nameSize = name.length > 26 ? 30 : name.length > 16 ? 36 : 44;

  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="cert-page">
      <div className="cert-tools no-print">
        <button type="button" onClick={onBack}>
          ← BACK TO REVIEW
        </button>
        <button type="button" className="cert-primary" onClick={print}>
          PRINT / SAVE AS PDF
        </button>
      </div>

      <section className="cert-sheet" aria-label="certificate of success">
        {/* the light bloom lives INSIDE the certificate — original purple */}
        <div className="cert-bloom no-print" aria-hidden="true">
          <LightBloom
            variant="shafts"
            direction="bottom"
            background="#0a0a10"
            baseColor="#6B2BF5"
            accentColor="#EFE6FF"
            speed={40}
            hover={60}
            light={{ rise: 55, spread: 82 }}
            shafts={{ count: 11, amount: 38, drift: 50 }}
            finish={{ grain: 10, vignette: 20 }}
          />
        </div>

        <div className="cert-content">
          {/* JavaScript wordmark + logo diagram — decoration only, not clickable */}
          <div className="cert-js" aria-hidden="true">
            <span className="cert-js-square">JS</span>
            <span className="cert-js-word">JAVASCRIPT</span>
          </div>

          <span className="cert-rule" aria-hidden="true" />

          <header className="cert-head">
            <h1>Certificate of Success</h1>
            <p className="cert-sub">JavaScript Proficiency Examination</p>
          </header>

          <p className="cert-line">This certifies that</p>
          <h2 className="cert-name" style={{ fontSize: nameSize }}>
            {name}
          </h2>
          <p className="cert-line">
            has completed the JS.QUIZZ gauntlet — <b>{total} questions</b> across{" "}
            <b>
              {rounds} round{rounds === 1 ? "" : "s"}
            </b>
            , from fixed foundations to freshly forged machine questions, under examination
            conditions.
          </p>

          <div className="cert-stats">
            <div>
              <b>
                {correct}/{total}
              </b>
              <span>score</span>
            </div>
            <div>
              <b>{accuracy}%</b>
              <span>accuracy</span>
            </div>
            <div>
              <b>{fmtTime(timeMs)}</b>
              <span>time</span>
            </div>
          </div>

          <footer className="cert-foot">
            <div className="cert-cell">
              <span className="sig-line" aria-hidden="true" />
              <span>Head of the Pit</span>
              <span>JS.QUIZZ Board</span>
            </div>
            <div className="cert-seal" aria-hidden="true">
              <span>JS·Q</span>
            </div>
            <div className="cert-cell">
              <span className="sig-line" aria-hidden="true" />
              <span>Date of issue</span>
              <span>{date}</span>
            </div>
          </footer>

          <span className="cert-id">CERTIFICATE NO. {certNo}</span>
        </div>
      </section>
    </main>
  );
}
