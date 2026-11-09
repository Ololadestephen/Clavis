import {
  Coins,
  Check,
  ExternalLink,
  Fingerprint,
  HeartPulse,
  KeyRound,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type React from "react";
import { LandingOpenAppButton } from "./components/LandingOpenAppButton";

const steps = [
  {
    title: "Escrow native BOT",
    body: "Deposit native BOT into an isolated smart contract vault. The owner retains full withdrawal and cancellation rights before terminal release.",
    icon: Coins,
  },
  {
    title: "Designate trusted roles",
    body: "Specify a beneficiary wallet and trusted guardians. Guardians verify owner inactivity, but never custody or control the funds.",
    icon: UsersRound,
  },
  {
    title: "Define release rules",
    body: "Set proof-of-life inactivity timeout, guardian consensus threshold, and a final timelock delay.",
    icon: Fingerprint,
  },
  {
    title: "Programmable on-chain release",
    body: "When inactivity expires, guardians approve, and delay elapses, the beneficiary executes claim and receives the BOT payout directly.",
    icon: ShieldCheck,
  },
];

const proofRows = [
  "Isolated per-vault BOT fund custody",
  "Owner heartbeat invalidates pending requests and resets inactivity",
  "Guardian approvals bound to request ID; cannot authorize future requests",
  "Terminal state locks liability and prevents duplicate claims",
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
            <a href="#proof">Security</a>
          </nav>
          <LandingOpenAppButton />
        </header>

        <div className="hero-content">
          <h1>Clavis</h1>
          <p className="hero-copy">
            Programmable native-BOT inheritance escrow for on-chain digital continuity.
          </p>
        </div>
      </section>

      <section className="section intro-section" id="how">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Escrowed native BOT released only when multi-party rules are met.</h2>
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
          <p className="eyebrow">Multi-Party Consensus</p>
          <h2>Guardians verify inactivity. Beneficiary claims funds.</h2>
          <p>
            The owner retains complete control of their funds through deposits, withdrawals, and heartbeats. If
            extended inactivity occurs, guardians confirm and approve the release to the designated beneficiary.
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            * This is an on-chain programmable asset release mechanism. It does not verify death, create a legal will,
            or recover external wallets.
          </p>
        </div>
        <aside className="rule-panel" aria-label="Recovery rule preview">
          <div className="panel-header">
            <KeyRound size={18} />
            <span>Vault Lifecycle Rules</span>
          </div>
          <ul>
            <li>
              <Check size={16} /> Owner inactivity period passes with no heartbeat
            </li>
            <li>
              <Check size={16} /> Beneficiary initiates recovery request
            </li>
            <li>
              <Check size={16} /> Configured threshold of guardians approve the request ID
            </li>
            <li>
              <Check size={16} /> Final timelock delay elapses
            </li>
            <li>
              <Check size={16} /> Owner has not cancelled or sent a heartbeat
            </li>
          </ul>
        </aside>
      </section>

      <section className="section proof-section" id="proof">
        <div className="proof-copy">
          <p className="eyebrow">On-Chain Guarantees</p>
          <h2>Financial isolation, reentrancy guards, and terminal state enforcement.</h2>
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

      <footer
        style={{
          padding: "3rem 2rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          maxWidth: "1100px",
          margin: "0 auto",
          fontSize: "0.85rem",
          color: "var(--muted)",
        }}
      >
        <div>
          <span>&copy; {new Date().getFullYear()} Clavis &middot; BOT Chain Native Escrow</span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <a
            href="https://www.botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          >
            BOT Chain <ExternalLink size={13} />
          </a>
          <a
            href="https://scan.botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          >
            BOT Scan Explorer <ExternalLink size={13} />
          </a>
          <a
            href="https://dev-docs.botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          >
            Developer Docs <ExternalLink size={13} />
          </a>
        </div>
      </footer>
    </main>
  );
}
