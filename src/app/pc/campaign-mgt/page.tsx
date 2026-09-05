import React from "react";
import CampaignDataTable from "./_components/CampaignDataTable";
import PageHeader from "@/components/PageHeader/PageHeader";

const CampaignManagementPage = () => {
  return (
    <main className="flex flex-col gap-3 mt-4 w-full">
      <PageHeader
        title="Campaign Management"
        description="Manage client campaigns, aggregators, and outreach templates."
        className="rounded-xl border border-primary/15 p-3 sm:p-3 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
      />
      <CampaignDataTable route="assistant" />
    </main>
  );
};
export default CampaignManagementPage;
