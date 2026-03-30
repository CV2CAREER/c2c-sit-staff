/* eslint-disable */
import React from "react";
import ClientDataTable from "@/app/admin/campaign-mgt/_components/ClientDataTable";
import ClientAvatarAndInsights from "@/app/admin/campaign-mgt/_components/ClientAvatarAndInsights";

type ClientPageParams = Promise<{ id: number }>;

export default function ClientPage(props: { params: ClientPageParams }) {
  const params = React.use(props.params);
  const clientId = params.id;

  return (
    <main className="flex flex-col gap-6 mt-6 w-full">
      <ClientAvatarAndInsights clientId={clientId} />
      <ClientDataTable clientId={clientId} route="admin" />
    </main>
  );
}
