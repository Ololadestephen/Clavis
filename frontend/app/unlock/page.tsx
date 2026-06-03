import { CheckCircle2, LockOpen } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UnlockCdr } from "./UnlockCdr";

export default function UnlockPage() {
  return (
    <AppShell
      active="Unlock"
      eyebrow="Secure access granted"
      title="Unlock the vault."
      description="When CDR verifies the Clavis read condition, the recovered secret is shown only here."
    >
      <section className="unlock-layout">
        <div className="app-card secret-card">
          <div className="unlock-badge">
            <LockOpen size={18} /> Waiting for CDR read condition
          </div>
          <h2>Secret is still sealed</h2>
          <p>Complete recovery, guardian approval, proof-of-life timeout, and final delay before reading or downloading.</p>
          <UnlockCdr />
        </div>
        <div className="app-card timeline-card">
          <h2>Unlock timeline</h2>
          {[
            "Recovery request",
            "Guardian approvals",
            "Proof-of-life timeout",
            "Final unlock delay",
            "CDR read",
          ].map((item) => (
            <p key={item}><CheckCircle2 size={16} /> {item}</p>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
