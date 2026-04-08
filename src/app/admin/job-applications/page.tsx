import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import { JobAppsAndQuestionsProvider } from "./_components/context";
import JobApplicationsAndQuestionsDataTable from "./_components/data-table";

export const metadata: Metadata = {
  title: "Job Applications",
};

export default function JobApplicationsPage() {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Job Applications and Questions" />
      <JobAppsAndQuestionsProvider>
        <JobApplicationsAndQuestionsDataTable />
      </JobAppsAndQuestionsProvider>
    </section>
  );
}
