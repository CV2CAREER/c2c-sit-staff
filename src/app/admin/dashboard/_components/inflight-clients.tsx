"use client";
import React, { useMemo } from "react";
import { StyledDataGridPro } from "@/utils/table";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket } from "lucide-react";

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
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Rocket size={18} />
          </span>
          In-Flight Clients
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
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
              sx={{
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
