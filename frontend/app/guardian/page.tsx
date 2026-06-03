import { AlertTriangle, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GuardianApproval } from "./GuardianApproval";

export default function GuardianPage() {
  return (
    <AppShell
      active="Guardians"
      eyebrow="Guardian approval"
      title="Review recovery requests."
      description="Approve recovery only when the request is legitimate. You never receive or view the secret."
    >
      <div className="two-column">
        <section className="app-card status-card">
          <span className="status-dot danger" />
          <h2>No active request selected</h2>
          <p>Select a recovery request to review its proof-of-life and approval status.</p>
          <div className="guardian-row">
            <span><AlertTriangle size={16} /> No approval has been submitted from this screen.</span>
          </div>
        </section>
        <section className="app-card action-panel">
          <ShieldCheck size={28} />
          <h2>Approve recovery?</h2>
          <p>Your signature counts toward the threshold. Guardians approve the condition, not the private data.</p>
          <GuardianApproval />
          <button className="ghost-action" type="button">Decline</button>
        </section>
      </div>
    </AppShell>
  );
}
