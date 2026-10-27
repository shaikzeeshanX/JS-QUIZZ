import { useState, type FormEvent } from "react";
import SlamButton from "../components/SlamButton";
import Marquee from "../components/Marquee";

export default function LoginPage({
  onLogin,
  busy,
}: {
  onLogin: (name: string, email: string) => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function submitLogin() {
    if (busy) return;
    // Accepts ANY name and ANY email-style input — send exactly what was
    // typed, no checks, no error messages. Empty fields are fine too.
    onLogin(name, email);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    submitLogin();
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="logo">
          JS<span className="dot">.</span>QUIZZ<span className="cursor">_</span>
        </div>
        <div className="userchip">
          <span className="chip red">BRUTAL EDITION</span>
          <span className="chip">20 QUESTIONS</span>
          <span className="chip cyan">NO PASSWORDS</span>
          <span className="chip">WORKS OFFLINE</span>
        </div>
      </header>
      <Marquee
        items={[
          "JAVASCRIPT QUIZ",
          "10 CORE QUESTIONS · FIXED",
          "10 FRESH FROM THE AI ENGINE",
          "NEW SET EVERY LOGIN",
          "NO MERCY",
        ]}
      />

      <div className="hero">
        <section>
          <h1 className="h1">
            <span className="outline-text">JAVASCRIPT</span>
            <br />
            <span className="hl">QUIZ.</span>
            <br />
            <span className="think">think sharper</span>
          </h1>
          <p className="sub">
            // Login with ANY name + ANY email-type input. No passwords. No gatekeeping.
            <br />
            // 10 foundation questions — always the same ten — then 10 machine-forged
            <br />
            // JavaScript questions that change on EVERY login.
          </p>
          <ul className="facts">
            <li>
              <span className="bullet">■</span> PHASE 1 — 10 FIXED FOUNDATION QUESTIONS (SAME EVERY TIME)
            </li>
            <li>
              <span className="bullet">■</span> PHASE 2 — 10 AI-ENGINE QUESTIONS (NEW EVERY LOGIN)
            </li>
            <li>
              <span className="bullet">■</span> QUICK ANSWER REVEALS UNDER EVERY QUESTION
            </li>
            <li>
              <span className="bullet">■</span> CORRECT CLICKS SPLASH REAL WATER
            </li>
            <li>
              <span className="bullet">■</span> LEADERBOARD + SERVER-SIDE SCORING
            </li>
          </ul>
          <div className="ladder">
            <span className="chip ink">MASTERY LADDER</span>
            <span className="rung">ROOKIE</span>
            <span className="arr">→</span>
            <span className="rung">RISING CODER</span>
            <span className="arr">→</span>
            <span className="rung">SOLID DEVELOPER</span>
            <span className="arr">→</span>
            <span className="rung">JS MONSTER</span>
            <span className="arr">→</span>
            <span className="rung top">★ JS MASTER</span>
            <span className="ladder-note">// every login = a fresh shot at the top rung.</span>
          </div>
        </section>

        <section className="card shadow-red">
          <h2 style={{ margin: "0 0 24px", fontSize: 26, textTransform: "uppercase" }}>LOGIN // ENTER THE PIT</h2>
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="name">YOUR NAME</label>
              <input
                id="name"
                className="input"
                type="text"
                autoComplete="name"
                placeholder="e.g. ZEE, anonymous_lord, X_X ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="field">
              <label htmlFor="email">YOUR EMAIL (ANY FORMAT WELCOME)</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="e.g. you@void.dev, x@y, hello..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="cta-stage" style={{ padding: "44px 44px", margin: "0 -44px" }}>
              <SlamButton
                label={busy ? "LINKING..." : "ENTER THE PIT ▶"}
                size={64}
                onClick={submitLogin}
                font={{ fontSize: 17 }}
              />
            </div>
            {/* hidden submit keeps the ENTER key working — the slam button is the only visible way in */}
            <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
            <p className="login-note">
              // fill the info, hit the big red button — the quiz unlocks only after you enter.
              <br />
              // (pressing the ENTER key does the same thing)
            </p>
          </form>
        </section>
      </div>

      {/* die-cut JS stickers — scattered across the full width, both sides */}
      <div className="sticker-strip" aria-hidden="true">
        <img className="stk stk-a" src="/img/sticker-emblem.png" alt="" />
        <img className="stk stk-b" src="/img/sticker-js1.png" alt="" />
        <img className="stk stk-c" src="/img/sticker-js2.png" alt="" />
        <img className="stk stk-d" src="/img/sticker-js4.png" alt="" />
      </div>

    </main>
  );
}
