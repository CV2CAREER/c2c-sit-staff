import React from "react";
import CampaignDataTable from "./_components/CampaignDataTable";
import PageHeader from "@/components/PageHeader/PageHeader";

const CampaignManagementPage = () => {
  return (
    <main className="flex flex-col gap-8 mt-8 w-full">
      <PageHeader title="Campaign Management"/>
      <CampaignDataTable route="assistant" />
    </main>
  );
};
export default CampaignManagementPage;
