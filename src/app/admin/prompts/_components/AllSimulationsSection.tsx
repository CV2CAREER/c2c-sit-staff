"use client";

import { useState } from "react";
import { GridColDef } from "@mui/x-data-grid-pro";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StyledDataGridPro } from "@/utils/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useAllVcsPromptSimulationRuns,
  VcsPromptSimulationRunWithKey,
} from "../hooks/use-vcs-prompt-simulations";
import { columnHeaderHint } from "./HintMark";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`);

const AllSimulationsSection = () => {
  const [viewRun, setViewRun] = useState<VcsPromptSimulationRunWithKey | null>(null);
  const { data, isLoading } = useAllVcsPromptSimulationRuns({ limit: 25 });
  const runs = data?.data?.rows || [];

  const columns: GridColDef[] = [
    {
      field: "key",
      headerName: "Key",
      width: 200,
      valueFormatter: (v) => v || "—",
      renderHeader: () => columnHeaderHint("Key", "Which prompt key this simulation run belongs to."),
    },
    {
      field: "createdAt",
      headerName: "Timestamp",
      width: 170,
      valueFormatter: (value) => formatDate(value as string),
      renderHeader: () => columnHeaderHint("Timestamp", "When this simulation run happened."),
    },
    {
      field: "triggeredBy",
      headerName: "User",
      width: 140,
      valueFormatter: (v) => v || "System",
      renderHeader: () =>
        columnHeaderHint("User", "Who triggered this run — System if it wasn't manual."),
    },
    {
      field: "version",
      headerName: "Version",
      width: 90,
      valueFormatter: (v) => (v ? `v${v}` : "—"),
      renderHeader: () => columnHeaderHint("Version", "Which version of the prompt was used for this run."),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderHeader: () =>
        columnHeaderHint("Status", "Success means the AI call completed; Failed means it errored out."),
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
      renderHeader: () => columnHeaderHint("Duration", "How long the AI call took to respond."),
    },
    {
      field: "output",
      headerName: "Output preview",
      flex: 1,
      minWidth: 200,
      valueGetter: (_value, row) => row.output || row.errorMessage || "",
      renderHeader: () =>
        columnHeaderHint(
          "Output preview",
          "The start of what the AI returned (or the error) — click View for the full text.",
        ),
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
      renderHeader: () => columnHeaderHint("", "Opens the full input/output for this run."),
      renderCell: (params) => (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setViewRun(params.row as VcsPromptSimulationRunWithKey);
          }}
        >
          View →
        </button>
      ),
    },
  ];

  return (
    <>
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="flex flex-col gap-2 p-4">
          <h3 className="text-sm font-bold text-gray-900">All Prompt Simulations</h3>
          <p className="text-xs text-gray-400">Every simulation run across every prompt key.</p>
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
        </CardContent>
      </Card>

      <Dialog open={!!viewRun} onOpenChange={(open) => !open && setViewRun(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Run {viewRun?.id.slice(0, 8)} · {viewRun?.key || "—"} · v{viewRun?.version || "—"}
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
    </>
  );
};

export default AllSimulationsSection;
