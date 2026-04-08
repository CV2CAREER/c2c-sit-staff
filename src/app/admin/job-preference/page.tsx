import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import { JobPreferenceProvider } from "./_components/context";
import JobPreferenceDataTable from "./_components/job-pref-data-table";

export const metadata: Metadata = {
  title: "Job Discovery",
};

export default function JobPreferencePage() {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Job Discovery" />
      <JobPreferenceProvider>
        <JobPreferenceDataTable />
      </JobPreferenceProvider>
    </section>
  );
}
