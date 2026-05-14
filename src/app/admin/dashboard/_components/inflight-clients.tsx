"use client";
import React, { useMemo } from "react";
import { StyledDataGridPro } from "@/utils/table";
import { useAdminQueries } from "@/hooks/api/admin.api";

export default function InFlightClients() {
  const [pagination] = React.useState({ pageSize: 5, page: 0 });

  const { inflightClientsListDomain } = useAdminQueries({
    fetchInflightClientsList: true,
    inflightPage: pagination.page + 1,
    inflightLimit: pagination.pageSize
  });

  const { data: clientsData = {}, isLoading } = inflightClientsListDomain;
  
  const modifyArray = () => [
    {
      field: "Full_Name",
      headerName: "Full Name",
      width: 250,
    },
    {
      field: "Alias_Email",
      headerName: "Alias Email",
      width: 200,
    },
    {
      field: "SeekSubStartDate",
      headerName: "Subscription Start",
      width: 200,
    },
    {
      field: "Assurance",
      headerName: "Assurance",
      width: 200,
    },
    {
      field: "SeekSubEndDate",
      headerName: "Subscription End",
      width: 200,
    },
    {
      field: "VaName",
      headerName: "PC Assigned",
      width: 200,
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
    },
  ];
  
  const transformedClientData = useMemo(() => {
    const items = clientsData?.inflightCredentials || [];
    if (Array.isArray(items)) {
      return items.map((item: any, index: number) => {
        const external = item.seekExternalCredentials || {};
        return {
          id: item?.id || index,
          Full_Name: external.Full_Name || "Unknown",
          Alias_Email: external.Alias_Email || item?.seekEmail || "N/A",
          SeekSubStartDate: item?.SeekSubStartDate ? new Date(item.SeekSubStartDate).toLocaleDateString() : "N/A",
          Assurance: external?.Assurance || "N/A",
          SeekSubEndDate: external.SeekSubEndDate || "N/A",
          VaName: item?.AssignedPCName || "Unassigned",
          status: item?.capitalized || "Unknown",
        };
      });
    } else {
      return [];
    }
  }, [clientsData]);

 
  return (
    <section className="py-6">
      <h2 className="text-xl font-bold mb-4">🚀 In-Flight Clients</h2>

      {isLoading ? (
        <p className="text-gray-500">Loading in-flight Clients...</p>
      ) : transformedClientData.length === 0 ? (
        <p className="text-gray-500">No in-flight Clients at the moment.</p>
      ) : (
        <div className="h-[800px] w-[100%]">
          <StyledDataGridPro
            disableRowSelectionOnClick
            rows={transformedClientData}
            columns={modifyArray()}
            rowCount={clientsData?.count ?? transformedClientData.length}
            getRowClassName={() => 'custom-row-class'}
            rowReordering
          />
        </div>
      )}
    </section>
  );
}
