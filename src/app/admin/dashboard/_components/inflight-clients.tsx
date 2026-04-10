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

  const { data: clientsData = [], isLoading } = inflightClientsListDomain;
  
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
   const items = clientsData?.items || [];
   if (Array.isArray(items)) {
     return items.map((item: any, index: number) => {
       return {
         id: item?.id || index,
         Full_Name: item?.firstName ? `${item.firstName} ${item.lastName}` : "Unknown",
         Alias_Email: item?.email || "N/A",
         SeekSubStartDate: item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A",
         SeekSubEndDate: "N/A", 
         Assurance: item?.role || "N/A",
         VaName: "Unassigned", 
         status: item?.isActive !== undefined ? (item.isActive ? "Active" : "Inactive") : "Unknown",
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
            rowCount={transformedClientData.length}
            getRowClassName={() => 'custom-row-class'}
            rowReordering
          />
        </div>
      )}
    </section>
  );
}
