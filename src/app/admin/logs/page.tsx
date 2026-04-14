import React from "react";
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader/PageHeader";
import BotLogTable from "./_components/BotLogTable";

export const metadata: Metadata = {
  title: "System Logs | Admin Dashboard",
  description: "View and manage system, scraper, and parser logs.",
};

const LogsPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8 pb-12">
      <PageHeader title="System and Bot Logs" />
      
      <div className="px-1">
        <BotLogTable />
      </div>
    </section>
  );
};

export default LogsPage;
