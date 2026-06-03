import { AppShell } from "../components/AppShell";
import { CreateVaultForm } from "./CreateVaultForm";

export default function CreateVaultPage() {
  return (
    <AppShell
      active="Create Vault"
      eyebrow="Initialize vault"
      title="Configure your recovery parameters."
      description="Choose the secret, beneficiary, guardians, proof-of-life timeout, and final unlock delay."
    >
      <CreateVaultForm />
    </AppShell>
  );
}
