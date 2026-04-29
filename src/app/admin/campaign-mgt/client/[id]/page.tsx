/* eslint-disable */
import React from "react";
import ClientDataTable from "@/app/admin/campaign-mgt/_components/ClientDataTable";
import ClientAvatarAndInsights from "@/app/admin/campaign-mgt/_components/ClientAvatarAndInsights";

export default async function ClientPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const clientId = params.id;
  // const userid = params.clientid

  return (
    <main className="flex flex-col gap-6 mt-6 w-full">
      <ClientAvatarAndInsights clientId={clientId}  />
      <ClientDataTable clientId={clientId} route="admin" />
    </main>
  );
}
