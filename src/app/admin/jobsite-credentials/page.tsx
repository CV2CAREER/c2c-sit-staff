import React from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import JobsiteCredentialsDataTable from "./_components/jobsite-credentials-data-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobsite Credentials | Career Coaching Admin",
  description:
    "Review and approve clients' job application email credentials.",
};

const JobsiteCredentialsPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Jobsite Credentials" />
      <JobsiteCredentialsDataTable />
    </section>
  );
};

export default JobsiteCredentialsPage;
