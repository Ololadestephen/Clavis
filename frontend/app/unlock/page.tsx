import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UnlockCdr } from "./UnlockCdr";

export default function UnlockPage() {
  return (
    <AppShell
      active="Release"
      eyebrow="On-Chain Escrow Audit"
      title="Vault Release & Claim"
      description="Inspect on-chain release eligibility, guardian approvals, inactivity countdown, and execute payout on BOT Chain."
    >
      <section className="unlock-layout">
        <div className="app-card secret-card">
          <div className="unlock-badge">
            <ShieldCheck size={18} /> Programmable Escrow Release
          </div>
          <h2>Release Verification</h2>
          <p>
            Verify whether guardian approvals, proof-of-life inactivity timeout, and final timelock delays have been
            satisfied on-chain before executing the beneficiary BOT payout.
          </p>
          <UnlockCdr />
        </div>
        <div className="app-card timeline-card">
          <h2>Release Requirements</h2>
          {[
            "1. Owner inactivity timeout expires",
            "2. Beneficiary initiates recovery request",
            "3. Multi-guardian threshold approval",
            "4. Final timelock delay passes",
            "5. Direct on-chain native BOT transfer",
          ].map((item) => (
            <p key={item}>
              <CheckCircle2 size={16} /> {item}
            </p>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
