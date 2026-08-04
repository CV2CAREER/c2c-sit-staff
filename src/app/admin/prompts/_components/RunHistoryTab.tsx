"use client";

import { useState } from "react";
import { GridColDef } from "@mui/x-data-grid-pro";
import { CheckCircle2, XCircle } from "lucide-react";
import { StyledDataGridPro } from "@/utils/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useVcsPromptSimulationRuns,
  VcsPromptSimulationRun,
  VcsPromptSimulationStatus,
} from "../hooks/use-vcs-prompt-simulations";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`);

interface RunHistoryTabProps {
  vcsId: string;
}

const RunHistoryTab = ({ vcsId }: RunHistoryTabProps) => {
  const [statusFilter, setStatusFilter] = useState<VcsPromptSimulationStatus | "all">("all");
  const [viewRun, setViewRun] = useState<VcsPromptSimulationRun | null>(null);

  const { data, isLoading } = useVcsPromptSimulationRuns(vcsId, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  const runs = data?.data?.rows || [];

  const columns: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "Timestamp",
      width: 170,
      valueFormatter: (value) => formatDate(value as string),
    },
    { field: "triggeredBy", headerName: "User", width: 140, valueFormatter: (v) => v || "System" },
    { field: "version", headerName: "Version", width: 90, valueFormatter: (v) => (v ? `v${v}` : "—") },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) =>
        params.value === "success" ? (
          <span className="flex h-full items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 size={13} />
            Success
          </span>
        ) : (
          <span className="flex h-full items-center gap-1 text-xs font-medium text-red-600">
            <XCircle size={13} />
            Failed
          </span>
        ),
    },
    {
      field: "durationMs",
      headerName: "Duration",
      width: 100,
      valueFormatter: (value) => formatMs(value as number),
    },
    {
      field: "output",
      headerName: "Output preview",
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, row) => row.output || row.errorMessage || "",
      renderCell: (params) => (
        <span className="truncate text-xs text-gray-600">
          {(params.value as string).slice(0, 120)}
        </span>
      ),
    },
    {
      field: "view",
      headerName: "",
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setViewRun(params.row as VcsPromptSimulationRun);
          }}
        >
          View →
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        {(["all", "success", "failed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              statusFilter === status
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {status === "all" ? "Status: All" : status}
          </button>
        ))}
      </div>

      <div className="h-[360px] w-full">
        <StyledDataGridPro
          rows={runs}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          rowHeight={40}
          disableRowSelectionOnClick
          pagination
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          sx={{
            border: "1px solid #f1f5f9",
            borderRadius: "12px",
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
          }}
        />
      </div>

      <Dialog open={!!viewRun} onOpenChange={(open) => !open && setViewRun(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Run {viewRun?.id.slice(0, 8)} · v{viewRun?.version || "—"}
            </DialogTitle>
            <DialogDescription>
              {viewRun && formatDate(viewRun.createdAt)} · triggered by{" "}
              {viewRun?.triggeredBy || "System"}
            </DialogDescription>
          </DialogHeader>

          {viewRun && (
            <div className="flex flex-col gap-4">
              {Object.keys(viewRun.variables || {}).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Variables
                  </p>
                  <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
                    {JSON.stringify(viewRun.variables, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {viewRun.status === "success" ? "Output" : "Error"}
                </p>
                <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
                  {viewRun.status === "success" ? viewRun.output : viewRun.errorMessage}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RunHistoryTab;
