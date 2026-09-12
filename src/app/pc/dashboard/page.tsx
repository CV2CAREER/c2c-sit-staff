import DashboardHeader from "./_components/header";
import AssistantDashboardComponent from "./_components/dashboard-compt";

export default function PlacementControllerDashboardPage() {
  return (
    <section className="mt-8 flex flex-col gap-8">
      <DashboardHeader />
      <AssistantDashboardComponent />
    </section>
  );
}
