import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import { JobAppsAndQuestionsProvider } from "../job-applications/_components/context";
import JobApplicationsAndQuestionsDataTable from "../job-applications/_components/data-table";

export const metadata: Metadata = {
  title: "JM Applications",
};

export default function JMApplicationsPage() {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="JM Applications" />
      <JobAppsAndQuestionsProvider initialSource={{ value: "jm", label: "JM" }}>
        <JobApplicationsAndQuestionsDataTable />
      </JobAppsAndQuestionsProvider>
    </section>
  );
}
