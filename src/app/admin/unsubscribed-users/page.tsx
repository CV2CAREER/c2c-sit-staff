import React from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import UnsubscribedUsersDataTable from "./_components/unsubscribed-data-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribed Users | Career Coaching Admin",
  description: "Manage users who have unsubscribed from the platform.",
};

const UnsubscribedUsersPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Unsubscribed Users" />
      <UnsubscribedUsersDataTable />
    </section>
  );
};

export default UnsubscribedUsersPage;