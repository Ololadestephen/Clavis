import {
  Check,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type React from "react";
import { LandingOpenAppButton } from "./components/LandingOpenAppButton";

const steps = [
  {
    title: "Seal the secret",
    body: "Store a seed phrase hint, recovery note, password, private key, or file inside a CDR vault.",
    icon: LockKeyhole,
  },
  {
    title: "Name your people",
    body: "Choose a beneficiary and trusted guardians. Guardians approve recovery, but never see the secret.",
    icon: UsersRound,
  },
  {
    title: "Define recovery rules",
    body: "Set proof-of-life timeout, guardian threshold, and final unlock delay.",
    icon: Fingerprint,
  },
  {
    title: "Unlock only when conditions pass",
    body: "CDR checks the Clavis contract before releasing private data to the beneficiary.",
    icon: ShieldCheck,
  },
];

const proofRows = [
  "CDR denied read before recovery",
  "CDR denied after one guardian",
  "CDR denied while timeout and delay were active",
  "CDR unlocked after conditions passed",
];

function GrassBlade({
  className,
  delay = "0s",
  duration = "12s",
  style,
}: {
  className: string;
  delay?: string;
  duration?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`grass-blade ${className}`}
      style={{ ...style, animationDelay: delay, animationDuration: duration }}
    />
  );
}

function GrassField() {
  const front = Array.from({ length: 34 }, (_, index) => ({
    left: `${index * 3.2 + (index % 3) * 0.5}%`,
    height: 34 + ((index * 17) % 42),
    width: 6 + (index % 5) * 2,
    rotate: -18 + ((index * 11) % 36),
    delay: `${-(index % 9)}s`,
  }));

  const back = Array.from({ length: 46 }, (_, index) => ({
    left: `${index * 2.3}%`,
    height: 18 + ((index * 13) % 28),
    width: 3 + (index % 4),
    rotate: -12 + ((index * 7) % 24),
    delay: `${-(index % 11)}s`,
  }));

  return (
    <div className="grass-field" aria-hidden="true">
      <div className="grass-haze" />
      <div className="grass-row grass-row-back">
        {back.map((blade, index) => (
          <GrassBlade
            key={`back-${index}`}
            className="grass-blade-back"
            delay={blade.delay}
            duration={`${16 + (index % 7)}s`}
            style={{
              left: blade.left,
              height: `${blade.height}vh`,
              width: `${blade.width}px`,
              transform: `rotate(${blade.rotate}deg)`,
            }}
          />
        ))}
      </div>
      <div className="grass-row grass-row-front">
        {front.map((blade, index) => (
          <GrassBlade
            key={`front-${index}`}
            className="grass-blade-front"
            delay={blade.delay}
            duration={`${11 + (index % 6)}s`}
            style={{
              left: blade.left,
              height: `${blade.height}vh`,
              width: `${blade.width}px`,
              transform: `rotate(${blade.rotate}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <div className="sky" aria-hidden="true">
          <div className="moon" />
          <div className="dawn-line" />
          <div className="fog fog-one" />
          <div className="fog fog-two" />
          <GrassField />
        </div>

        <header className="top-nav">
          <a className="brand-mark" href="#top" aria-label="Clavis home">
            <img src="/clavis-icon.png" alt="" />
          </a>
          <nav aria-label="Primary navigation">
            <a href="#how">How</a>
            <a href="#rule">Rule</a>
            <a href="#proof">Proof</a>
          </nav>
          <LandingOpenAppButton />
        </header>

        <div className="hero-content">
          <h1>Clavis</h1>
          <p className="hero-copy">
            A programmable private recovery vault for your digital life.
          </p>
        </div>
      </section>

      <section className="section intro-section" id="how">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Your secret stays sealed until your rules say otherwise.</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="step-card" key={step.title}>
                <div className="step-number">0{index + 1}</div>
                <Icon size={22} strokeWidth={1.5} />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section split-section" id="rule">
        <div>
          <p className="eyebrow">The recovery rule</p>
          <h2>Guardians approve. They never see the secret.</h2>
          <p>
            The frontend does not decide access. CDR checks the Clavis smart
            contract before releasing private data.
          </p>
        </div>
        <aside className="rule-panel" aria-label="Recovery rule preview">
          <div className="panel-header">
            <KeyRound size={18} />
            <span>Vault rule preview</span>
          </div>
          <ul>
            <li>
              <Check size={16} /> Owner has not checked in for 30 days
            </li>
            <li>
              <Check size={16} /> 2 of 3 guardians approve
            </li>
            <li>
              <Check size={16} /> 24 hour final delay passes
            </li>
            <li>
              <Check size={16} /> Owner has not cancelled recovery
            </li>
          </ul>
        </aside>
      </section>

      <section className="section proof-section" id="proof">
        <div className="proof-copy">
          <p className="eyebrow">Live CDR proof</p>
          <h2>Not just an interface. The CDR contract enforced the lock.</h2>
        </div>
        <div className="proof-grid">
          {proofRows.map((row) => (
            <div className="proof-row" key={row}>
              <ShieldCheck size={18} />
              <span>{row}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section demand-section" id="early-access">
        <div className="demand-copy">
          <p className="eyebrow">Built for real recovery plans</p>
          <h2>Make your recovery plan before you need it.</h2>
          <p>
            Clavis is for wallet recovery, family emergency access, team
            credential recovery, and key-person contingency.
          </p>
        </div>
      </section>
    </main>
  );
}
