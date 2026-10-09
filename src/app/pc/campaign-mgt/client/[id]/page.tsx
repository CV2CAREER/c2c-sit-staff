/* eslint-disable */
import React from "react";
import ClientDataTable from "@/app/admin/campaign-mgt/_components/ClientDataTable";
import PcClientAccessGuard from "@/components/PcClientAccessGuard";

export default async function ClientPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const clientId = params.id;
  // const userid = params.clientid

  return (
    <main className="flex flex-col gap-6 mt-6 w-full">
      {/* SPR-21-02-004: identity now renders inside ClientDataTable's single
          consolidated profile card. */}
      <PcClientAccessGuard clientId={clientId} backHref="/pc/campaign-mgt" backLabel="Back to campaign management">
        <ClientDataTable clientId={clientId} route="admin" />
      </PcClientAccessGuard>
    </main>
  );
}