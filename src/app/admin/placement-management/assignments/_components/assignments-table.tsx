"use client";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { AssignmentRoleKey, AssignmentRow } from "@/hooks/api/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StyledDataGridPro } from "@/utils/table";
import { ClipboardList, Loader2, PencilLine } from "lucide-react";
import { GridToolbar } from "@mui/x-data-grid-pro";
import type { GridColDef, GridRenderCellParams, GridRowSelectionModel } from "@mui/x-data-grid-pro";
import ClientAssignmentDrawer from "../../_components/client-assignment-drawer";

const ROLE_LABELS: Record<AssignmentRoleKey, string> = {
  dpc: "DPC",
  vpc: "VPC",
  spc: "SPC",
  interimdpc: "Interim DPC",
  interimspc: "Interim SPC",
};
const ROLE_KEYS: AssignmentRoleKey[] = ["dpc", "vpc", "spc", "interimdpc", "interimspc"];
// Same per-controller cap the Pipeline coverage card implicitly assumes
// "overload" looks like — flagged here rather than enforced, same as the
// reference console.
const OVERLOAD = 15;
// Radix Select.Item rejects an empty-string value, so "unassign" needs a
// real sentinel that gets translated back to "" before it hits the API.
const UNASSIGNED = "__unassigned__";

type ChipKey = "all" | "risk" | "gap";
const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "all", label: "All in flight" },
  { key: "risk", label: "Renewal inside 30 days" },
  { key: "gap", label: "Controller missing" },
];

const daysLabel = (days: number | null) => (days === null ? "—" : days < 0 ? `${Math.abs(days)} over` : String(days));
const daysColor = (days: number | null) => (days === null || days < 0 ? "#C23434" : days <= 14 ? "#B4530A" : "#12202D");

export default function AssignmentsTable() {
  const { placementAssignmentsDomain } = useAdminQueries({ fetchPlacementAssignments: true });
  const { bulkAssignMutation } = useAdminMutations();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = placementAssignmentsDomain;
  const rows = data?.rows ?? [];
  const controllers = data?.controllers ?? [];

  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ChipKey>("all");
  const [allowEditing, setAllowEditing] = useState(false);
  const [selection, setSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const [bulkRole, setBulkRole] = useState<AssignmentRoleKey>("dpc");
  const [bulkController, setBulkController] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const [drawerCredId, setDrawerCredId] = useState<string | null>(null);

  const selectedIds = useMemo(() => Array.from(selection.ids) as string[], [selection]);

  const clearSelection = () => setSelection({ type: "include", ids: new Set() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-placement-assignments"] });

  const filtered = useMemo(() => {
    let pool = data?.rows ?? [];
    if (chip === "risk") pool = pool.filter((r) => r.days === null || r.days <= 30);
    if (chip === "gap") pool = pool.filter((r) => r.gaps > 0);
    const q = query.trim().toLowerCase();
    if (q) {
      pool = pool.filter((r) =>
        [r.name, r.dpc.name, r.vpc.name, r.spc.name, r.interimdpc.name, r.interimspc.name, r.industry]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return [...pool].sort((a, b) => (a.days ?? 900000) - (b.days ?? 900000));
  }, [data, chip, query]);

  const gridRows = useMemo(() => filtered.map((r) => ({ ...r, id: r.credId })), [filtered]);

  const loadFor = (role: AssignmentRoleKey, controllerName: string) => {
    const key = controllerName.trim().toLowerCase();
    if (!key) return 0;
    return rows.filter((r) => (r[role].name || "").trim().toLowerCase() === key).length;
  };

  const applyBulk = async () => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds;
    const controllerName = controllers.find((c) => c.email === bulkController)?.name || null;
    setBulkPending(true);
    const toastId = toast.loading(`Assigning ${ids.length} client${ids.length === 1 ? "" : "s"}…`);
    try {
      await bulkAssignMutation.mutateAsync({
        credIds: ids,
        role: bulkRole,
        controllerName: bulkController ? controllerName : null,
        controllerEmail: bulkController || null,
      });
      toast.dismiss(toastId);
      toast.success(`${ROLE_LABELS[bulkRole]} updated for ${ids.length} client${ids.length === 1 ? "" : "s"}`);
      clearSelection();
      invalidate();
    } catch {
      toast.dismiss(toastId);
      toast.error("Bulk assignment failed");
    } finally {
      setBulkPending(false);
    }
  };

  const bulkControllerName = controllers.find((c) => c.email === bulkController)?.name || "";
  const bulkOverloadWarning =
    bulkController && bulkControllerName
      ? (() => {
          const projected = loadFor(bulkRole, bulkControllerName) + selectedIds.length;
          return projected > OVERLOAD
            ? `${bulkControllerName} would carry ${projected} clients as ${ROLE_LABELS[bulkRole]}, above the limit of ${OVERLOAD}.`
            : "";
        })()
      : "";

  // Read-only display for a role cell — plain text, no interaction, unless
  // editing is switched on, in which case the name becomes a link that opens
  // the shared assignment drawer for that client.
  const RoleDisplay = ({ row, role }: { row: AssignmentRow; role: AssignmentRoleKey }) => {
    const value = row[role];
    const label = value.name ? `${value.name} (${value.load})` : "Unassigned";
    const color = value.name ? (value.load > OVERLOAD ? "#B4530A" : "#12202D") : "#C23434";

    if (!allowEditing) {
      return (
        <span className="truncate text-[13px]" style={{ color, fontWeight: value.name ? 400 : 600 }}>
          {label}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setDrawerCredId(row.credId)}
        className="truncate text-left text-[13px] hover:underline"
        style={{ color, fontWeight: value.name ? 500 : 600 }}
      >
        {label}
      </button>
    );
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Client",
        flex: 1.3,
        minWidth: 190,
        renderCell: (params: GridRenderCellParams) =>
          allowEditing ? (
            <button
              type="button"
              onClick={() => setDrawerCredId(params.row.credId)}
              className="truncate text-left text-[13px] font-semibold text-gray-900 hover:text-primary hover:underline"
            >
              {params.row.name}
            </button>
          ) : (
            <span className="truncate text-[13px] font-semibold text-gray-900">{params.row.name}</span>
          ),
      },
      ...ROLE_KEYS.map(
        (role): GridColDef => ({
          field: role,
          headerName: ROLE_LABELS[role],
          flex: 1,
          minWidth: 170,
          sortable: false,
          filterable: false,
          renderCell: (params: GridRenderCellParams) => <RoleDisplay row={params.row} role={role} />,
        }),
      ),
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
        renderCell: (params: GridRenderCellParams) => params.row.industry || "—",
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
      {
        field: "coverage",
        headerName: "Coverage",
        flex: 1,
        minWidth: 150,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => {
          const gaps: number = params.row.gaps;
          return (
            <span
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium"
              style={{ color: gaps === 0 ? "#177A5E" : "#8E2626" }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: gaps === 0 ? "#1EB62D" : "#C23434" }}
              />
              {gaps === 0 ? "Full team" : `${gaps} role${gaps > 1 ? "s" : ""} open`}
            </span>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controllers, allowEditing],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filters section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList size={18} />
              </span>
              Assignments — in-flight clients
            </CardTitle>
            <label className="flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
              <Checkbox
                checked={allowEditing}
                onClick={() =>
                  setAllowEditing((prev) => {
                    if (prev) clearSelection();
                    return !prev;
                  })
                }
              />
              <PencilLine size={16} className="text-primary" />
              Allow Editing
            </label>
          </div>
          <p className="mt-1 pl-11 text-xs text-gray-500">
            {allowEditing
              ? "Click a client or a DPC / VPC / SPC / Interim DPC / Interim SPC name to open the assign panel · tick rows to assign in bulk"
              : "Read-only — switch on Allow Editing to change assignments"}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client, controller, industry"
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
                {filtered.length} of {rows.length} in flight
              </span>
            )}
          </div>

          {allowEditing && selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/15 bg-[#EAF6FD] px-4 py-3 md:px-5">
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#004174]">
                {selectedIds.length} selected
              </span>
              <span className="hidden h-5 w-px shrink-0 bg-[#004174]/15 md:block" />
              <span className="shrink-0 whitespace-nowrap text-xs text-[#55697D]">Assign</span>
              <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as AssignmentRoleKey)}>
                <SelectTrigger className="h-[34px] w-[130px] shrink-0 border-primary/20 bg-white px-2.5 text-xs text-[#12202D] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ROLE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="shrink-0 whitespace-nowrap text-xs text-[#55697D]">to</span>
              <Select value={bulkController || UNASSIGNED} onValueChange={(v) => setBulkController(v === UNASSIGNED ? "" : v)}>
                <SelectTrigger className="h-[34px] w-[200px] shrink-0 border-primary/20 bg-white px-2.5 text-xs text-[#12202D] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>— Unassign</SelectItem>
                  {controllers.map((c) => (
                    <SelectItem key={c.email} value={c.email}>
                      {c.name} ({loadFor(bulkRole, c.name)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={applyBulk}
                disabled={bulkPending}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#004174] disabled:opacity-60"
              >
                {bulkPending && <Loader2 size={13} className="animate-spin" />}
                {bulkPending ? "Assigning…" : "Apply"}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkPending}
                className="shrink-0 rounded-md px-3 py-2 text-xs text-[#55697D] hover:text-[#12202D] disabled:opacity-50"
              >
                Clear
              </button>
              {bulkOverloadWarning && (
                <span
                  className="min-w-0 flex-1 truncate text-xs text-[#B4530A] md:text-right"
                  title={bulkOverloadWarning}
                >
                  {bulkOverloadWarning}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="p-4">
          <div className="h-[720px] w-full">
            <StyledDataGridPro
              disableRowSelectionOnClick
              checkboxSelection={allowEditing}
              rowSelectionModel={selection}
              onRowSelectionModelChange={(newSelection: GridRowSelectionModel) => setSelection(newSelection)}
              rows={gridRows}
              columns={columns}
              loading={isLoading}
              rowHeight={52}
              pagination
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              showToolbar
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
            <p className="mt-4 text-xs text-[#C23434]">Couldn&apos;t load assignments — try refreshing the page.</p>
          )}

          {!isLoading && !isError && (
            <p className="mt-4 rounded-lg border border-[#F2E0A6] bg-[#FFFBEF] px-4 py-2.5 text-xs leading-relaxed text-[#7A5400]">
              {rows.filter((r) => r.gaps > 0).length} of {rows.length} in-flight clients are missing at least one
              controller. Numbers in brackets are that person&apos;s current load; the limit is {OVERLOAD}.
            </p>
          )}
        </CardContent>
      </Card>

      <ClientAssignmentDrawer
        credId={drawerCredId}
        onClose={() => setDrawerCredId(null)}
        onChanged={invalidate}
      />
    </div>
  );
}
