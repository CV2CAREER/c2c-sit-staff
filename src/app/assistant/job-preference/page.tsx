import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import { JobPreferenceProvider } from "./_components/context";
import JobPreferenceDataTable from "./_components/job-pref-data-table";

export const metadata: Metadata = {
  title: "Job Discovery",
};

export default function JobPreferencePage() {
  return (
    <section className="flex flex-col gap-6 mt-6">
      <PageHeader
        title="Job Discovery"
        className="rounded-xl border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
      />
      <JobPreferenceProvider>
        <JobPreferenceDataTable />
      </JobPreferenceProvider>
    </section>
  );
}
