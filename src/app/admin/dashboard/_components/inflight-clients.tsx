"use client";
import React, { useMemo } from "react";
import { StyledDataGridPro } from "@/utils/table";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-pro";

// Flags an "Invalid Date" string or a date ending in a 2010-2025 year as
// likely bad legacy data — same heuristic the original dashboard mockup
// used (dateWarn()), just ported here since these are the same fields
// (Assurance / Sub Start / Sub End) rendered in a real DataGrid instead of
// a plain table.
function dateWarn(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return value === "Invalid Date" || /20(1[0-9]|2[0-5])$/.test(value);
}

// SeekSubStartDate/SeekSubEndDate are both stored as DD-MM-YYYY strings
// (see the backend's campaign-calculator.ts formatDate) — this matches that
// so the createdAt fallback renders in the same format instead of the
// locale-dependent M/D/YYYY toLocaleDateString() produces.
function formatDDMMYYYY(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

// Assurance sometimes comes through as an ISO timestamp rather than the
// DD-MM-YYYY string Sub Start/Sub End use — normalize it to match so all
// three date-ish columns render consistently. Non-date values (e.g. a
// legacy tier name) pass through unchanged rather than becoming "Invalid Date".
function normalizeDateDisplay(value: string): string {
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? value : formatDDMMYYYY(parsed);
}

function DateCell({ value }: { value: string }) {
  return (
    <span style={{ color: dateWarn(value) ? "#B26A22" : "inherit", fontWeight: dateWarn(value) ? 600 : 400 }}>
      {value}
    </span>
  );
}

export default function InFlightClients() {
  // Purely local UI state — the backend returns the full in-flight list in
  // one shot, so the DataGrid paginates it client-side.
  const [pagination, setPagination] = React.useState({ pageSize: 20, page: 0 });

  const { inflightClientsListDomain } = useAdminQueries({
    fetchInflightClientsList: true,
  });

  const { data: clientsData = {}, isLoading } = inflightClientsListDomain;

  const columns: GridColDef[] = useMemo(() => [
    {
      field: "Full_Name",
      headerName: "Client",
      flex: 1.4,
      minWidth: 200,
    },
    {
      field: "VaName",
      headerName: "Controller",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            padding: "2px 9px",
            borderRadius: 999,
            background: params.value === "Unassigned" ? "#FDEEEE" : "#F1F5F9",
            color: params.value === "Unassigned" ? "#C23434" : "#4A5B6B",
          }}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: "Assurance",
      headerName: "Assurance",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => <DateCell value={params.value} />,
    },
    {
      field: "SeekSubStartDate",
      headerName: "Sub Start",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => <DateCell value={params.value} />,
    },
    {
      field: "SeekSubEndDate",
      headerName: "Sub End",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => <DateCell value={params.value} />,
    },
  ], []);

  const transformedClientData = useMemo(() => {
    const items = clientsData?.inflightCredentials || [];
    if (Array.isArray(items)) {
      return items.map((item: any, index: number) => {
        const external = item.seekExternalCredentials || {};
        return {
          id: item?.id || index,
          Full_Name: external.Full_Name || "Unknown",
          // Falls back to createdAt when SeekSubStartDate wasn't set, same as
          // campaign-calculator.ts's calculateCampaignFields does for legacy rows.
          SeekSubStartDate: item?.SeekSubStartDate
            ? item.SeekSubStartDate
            : item?.createdAt
              ? formatDDMMYYYY(new Date(item.createdAt))
              : "N/A",
          Assurance: external?.Assurance ? normalizeDateDisplay(external.Assurance) : "N/A",
          SeekSubEndDate: external.SeekSubEndDate || "N/A",
          VaName: item?.AssignedPCName || "Unassigned",
        };
      });
    } else {
      return [];
    }
  }, [clientsData]);

  const unreadableDatesCount = useMemo(
    () =>
      transformedClientData.filter(
        (row) => dateWarn(row.Assurance) || dateWarn(row.SeekSubStartDate) || dateWarn(row.SeekSubEndDate),
      ).length,
    [transformedClientData],
  );

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Rocket size={18} />
          </span>
          In-Flight Clients
        </CardTitle>
        {!isLoading && (
          <p className="mt-1 pl-11 text-xs text-gray-500">
            {transformedClientData.length} active campaign{transformedClientData.length === 1 ? "" : "s"}
            {unreadableDatesCount > 0 && (
              <span className="text-[#B26A22]">
                {" "}
                · {unreadableDatesCount} record{unreadableDatesCount === 1 ? "" : "s"} have unreadable dates
              </span>
            )}
          </p>
        )}
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
              columns={columns}
              pagination
              pageSizeOptions={[10, 25, 50]}
              paginationModel={pagination}
              onPaginationModelChange={setPagination}
              rowCount={transformedClientData.length}
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
