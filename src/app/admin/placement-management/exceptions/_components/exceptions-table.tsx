"use client";
import { useMemo, useState } from "react";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StyledDataGridPro } from "@/utils/table";
import { AlertTriangle } from "lucide-react";
import { GridToolbar } from "@mui/x-data-grid-pro";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-pro";
import ClientAssignmentDrawer from "../../_components/client-assignment-drawer";

type ChipKey = "all" | "bad" | "hold" | "renewal" | "data";
const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bad", label: "Urgent" },
  { key: "hold", label: "On hold" },
  { key: "renewal", label: "Renewal window" },
  { key: "data", label: "Missing data" },
];

const REASON_TONE: Record<string, { fg: string; dot: string }> = {
  "On hold": { fg: "#8A6A12", dot: "#E8B93A" },
  "Ends within 14 days": { fg: "#8A6A12", dot: "#E8B93A" },
  "Past end date": { fg: "#C23434", dot: "#C23434" },
  "No end date": { fg: "#C23434", dot: "#C23434" },
  "Controller role unassigned": { fg: "#C23434", dot: "#C23434" },
};

const daysLabel = (days: number | null) => (days === null ? "—" : days < 0 ? `${Math.abs(days)} over` : String(days));
const daysColor = (days: number | null) => (days === null || days < 0 ? "#C23434" : "#B4530A");

export default function ExceptionsTable() {
  const { placementExceptionsDomain } = useAdminQueries({ fetchPlacementExceptions: true });
  const { data, isLoading, isError } = placementExceptionsDomain;
  const rows = data?.rows ?? [];

  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ChipKey>("all");
  const [drawerCredId, setDrawerCredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let pool = rows;
    if (chip === "bad") pool = pool.filter((r) => r.level === "bad");
    if (chip === "hold") pool = pool.filter((r) => r.reason === "On hold");
    if (chip === "renewal") pool = pool.filter((r) => r.reason === "Ends within 14 days" || r.reason === "Past end date");
    if (chip === "data") pool = pool.filter((r) => r.reason === "No end date" || r.reason === "Controller role unassigned");
    const q = query.trim().toLowerCase();
    if (q) {
      pool = pool.filter((r) =>
        [r.name, r.reason, r.dpc, r.status].filter(Boolean).join(" ").toLowerCase().includes(q),
      );
    }
    return pool;
  }, [rows, chip, query]);

  const gridRows = useMemo(
    () => filtered.map((r, i) => ({ ...r, id: `${r.credId}:${r.reason}:${i}` })),
    [filtered],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Client",
        flex: 1.2,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams) => (
          <button
            type="button"
            onClick={() => setDrawerCredId(params.row.credId)}
            className="truncate text-left text-[13px] font-semibold text-gray-900 hover:text-primary hover:underline"
          >
            {params.row.name}
          </button>
        ),
      },
      {
        field: "reason",
        headerName: "Reason",
        flex: 1.1,
        minWidth: 190,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => {
          const reason: string = params.row.reason;
          const tone = REASON_TONE[reason] || { fg: "#55697D", dot: "#C7D3DE" };
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: tone.fg }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: tone.dot }} />
              {reason}
            </span>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        renderCell: (params: GridRenderCellParams) => params.row.status || "—",
      },
      {
        field: "dpc",
        headerName: "DPC",
        flex: 1,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams) => params.row.dpc || "—",
      },
      {
        field: "subEnd",
        headerName: "Sub end",
        width: 110,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams) => params.row.subEnd || "—",
      },
      {
        field: "days",
        headerName: "Days",
        width: 90,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams) => (
          <span style={{ color: daysColor(params.row.days), fontWeight: 600 }}>{daysLabel(params.row.days)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filters section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AlertTriangle size={18} />
            </span>
            Exceptions
          </CardTitle>
          <p className="mt-1 pl-11 text-xs text-gray-500">
            On hold, renewal window, past end date and missing data · click a client to open the assign panel
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client or controller"
              className="h-[38px] w-[300px] rounded-lg border border-gray-200 bg-white px-3.5 text-[13px] outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setChip(c.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    chip === c.key ? "bg-primary text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {!isLoading && (
              <span className="text-xs text-gray-500">
                {filtered.length} of {rows.length} exceptions
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="p-4">
          <div className="h-[720px] w-full">
            <StyledDataGridPro
              disableRowSelectionOnClick
              rows={gridRows}
              columns={columns}
              loading={isLoading}
              rowHeight={52}
              pagination
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: false } as any }}
              sx={{
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
              }}
            />
          </div>

          {isError && (
            <p className="mt-4 text-xs text-[#C23434]">Couldn&apos;t load exceptions — try refreshing the page.</p>
          )}

          {!isLoading && !isError && data && (
            <p className="mt-4 rounded-lg border border-[#F2E0A6] bg-[#FFFBEF] px-4 py-2.5 text-xs leading-relaxed text-[#7A5400]">
              {data.lapsedCount} past end date · {data.renewalCount} ending within 14 days · {data.holdCount} on
              hold · {data.noDateCount} with no end date. A client can appear on more than one line.
            </p>
          )}
        </CardContent>
      </Card>

      <ClientAssignmentDrawer credId={drawerCredId} onClose={() => setDrawerCredId(null)} />
    </div>
  );
}
