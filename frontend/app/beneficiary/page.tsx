import { Clock3, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { RecoveryRequest } from "./RecoveryRequest";

export default function BeneficiaryPage() {
  return (
    <AppShell
      active="Recovery"
      eyebrow="Beneficiary recovery"
      title="Request recovery access."
      description="Start recovery for a vault where you are the named beneficiary."
    >
      <div className="two-column">
        <section className="app-card status-card">
          <span className="status-dot warning" />
          <h2>Vault is sealed</h2>
          <p>Request recovery to begin the guardian approval flow.</p>
          <RecoveryRequest />
        </section>
        <section className="app-card checklist-card">
          <h2>Unlock requires</h2>
          <p><ShieldCheck size={16} /> Beneficiary recovery request</p>
          <p><Clock3 size={16} /> Guardian threshold approval</p>
          <p><Clock3 size={16} /> Proof-of-life timeout</p>
          <p><Clock3 size={16} /> Final unlock delay</p>
        </section>
      </div>
    </AppShell>
  );
}
