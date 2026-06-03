import { AppShell } from "../components/AppShell";
import { DashboardOverview } from "./DashboardOverview";

export default function DashboardPage() {
  return (
    <AppShell
      active="Overview"
      eyebrow="System online"
      title="Set up your recovery vault."
      description="Create a vault, add guardians, and keep your proof-of-life check-in active."
    >
      <DashboardOverview />
    </AppShell>
  );
}
