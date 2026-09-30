/* eslint-disable */
import React from "react";
import ClientDataTable from "@/app/admin/campaign-mgt/_components/ClientDataTable";

export default async function ClientPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const clientId = params.id;
  // const userid = params.clientid

  return (
    <main className="flex flex-col gap-4 mt-4 w-full">
      {/* SPR-21-02-004: identity now renders inside ClientDataTable's single
          consolidated profile card. */}
      <ClientDataTable clientId={clientId} route="admin" />
    </main>
  );
}
