"use client";

import { useState } from "react";
import { GridColDef } from "@mui/x-data-grid-pro";
import { ArrowLeft, Activity, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StyledDataGridPro } from "@/utils/table";
import { useVcsPromptUsageSummary, useVcsPromptUsageLogs } from "../hooks/use-vcs-prompt-usage";
import { columnHeaderHint } from "./HintMark";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

const formatMs = (ms?: number) => {
  if (ms === undefined || ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
};

const summaryColumns: GridColDef[] = [
  {
    field: "key",
    headerName: "Key",
    flex: 1,
    minWidth: 240,
    renderHeader: () =>
      columnHeaderHint("Key", "The prompt key these stats are aggregated for. Click a row to see every individual call."),
  },
  {
    field: "version",
    headerName: "Version",
    width: 90,
    valueFormatter: (v) => v ?? "—",
    renderHeader: () =>
      columnHeaderHint("Version", "Prompt version these stats cover (blank if calls span multiple versions)."),
  },
  {
    field: "totalCalls",
    headerName: "Calls",
    width: 90,
    renderHeader: () => columnHeaderHint("Calls", "Total number of times this prompt has been called."),
  },
  {
    field: "avgDurationMs",
    headerName: "Avg Time",
    width: 150,
    valueFormatter: (value) => formatMs(value as number),
    renderHeader: () => columnHeaderHint("Avg Time", "Average AI response time across all calls."),
  },
  {
    field: "minDurationMs",
    headerName: "Min Time",
    width: 150,
    valueFormatter: (value) => formatMs(value as number),
    renderHeader: () => columnHeaderHint("Min Time", "The fastest recorded response time."),
  },
  {
    field: "maxDurationMs",
    headerName: "Max Time",
    width: 150,
    valueFormatter: (value) => formatMs(value as number),
    renderHeader: () => columnHeaderHint("Max Time", "The slowest recorded response time."),
  },
  {
    field: "avgPromptLength",
    headerName: "Avg Prompt",
    width: 150,
    valueFormatter: (value) => `${(value as number).toLocaleString()} ch`,
    renderHeader: () =>
      columnHeaderHint("Avg Prompt", "Average length of the prompt text sent to the AI, in characters."),
  },
  {
    field: "avgResponseLength",
    headerName: "Avg Response",
    width: 150,
    valueFormatter: (value) => `${(value as number).toLocaleString()} ch`,
    renderHeader: () =>
      columnHeaderHint("Avg Response", "Average length of the AI's response, in characters."),
  },
  {
    field: "successRate",
    headerName: "Success",
    width: 150,
    renderHeader: () =>
      columnHeaderHint("Success", "Percentage of calls that completed without error."),
    renderCell: (params) => {
      const rate = params.value as number;
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            rate >= 95
              ? "bg-emerald-50 text-emerald-600"
              : rate >= 80
                ? "bg-amber-50 text-amber-600"
                : "bg-red-50 text-red-600"
          }`}
        >
          {rate}%
        </span>
      );
    },
  },
  {
    field: "lastRunAt",
    headerName: "Last run",
    width: 180,
    valueFormatter: (value) => formatDate(value as string),
    renderHeader: () => columnHeaderHint("Last run", "When this prompt was most recently called."),
  },
];

const logColumns: GridColDef[] = [
  {
    field: "createdAt",
    headerName: "When",
    width: 180,
    valueFormatter: (value) => formatDate(value as string),
    renderHeader: () => columnHeaderHint("When", "Timestamp of this individual AI call."),
  },
  {
    field: "version",
    headerName: "Version",
    width: 90,
    valueFormatter: (v) => v ?? "—",
    renderHeader: () => columnHeaderHint("Version", "Prompt version used for this call."),
  },
  {
    field: "durationMs",
    headerName: "Duration",
    width: 110,
    valueFormatter: (value) => formatMs(value as number),
    renderHeader: () => columnHeaderHint("Duration", "How long this specific call took."),
  },
  {
    field: "promptLength",
    headerName: "Prompt",
    width: 100,
    valueFormatter: (value) => `${(value as number).toLocaleString()} ch`,
    renderHeader: () => columnHeaderHint("Prompt", "Length of the prompt text sent, in characters."),
  },
  {
    field: "responseLength",
    headerName: "Response",
    width: 110,
    valueFormatter: (value) => (value != null ? `${(value as number).toLocaleString()} ch` : "—"),
    renderHeader: () =>
      columnHeaderHint("Response", "Length of the AI's response, in characters (blank if it failed)."),
  },
  {
    field: "success",
    headerName: "Status",
    width: 100,
    renderHeader: () =>
      columnHeaderHint("Status", "Whether the call succeeded or failed — hover a Failed badge for the error."),
    renderCell: (params) =>
      params.value ? (
        <span className="flex h-full items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 size={13} />
          OK
        </span>
      ) : (
        <span
          className="flex h-full items-center gap-1 text-xs font-medium text-red-600"
          title={params.row.errorMessage || undefined}
        >
          <XCircle size={13} />
          Failed
        </span>
      ),
  },
  {
    field: "errorMessage",
    headerName: "Error",
    flex: 1,
    minWidth: 200,
    valueFormatter: (value) => value ?? "",
    renderHeader: () => columnHeaderHint("Error", "The error message returned, if the call failed."),
  },
];

const UsageAnalyticsSection = () => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { data: summaryData, isLoading: summaryLoading } = useVcsPromptUsageSummary(!selectedKey);
  const { data: logsData, isLoading: logsLoading } = useVcsPromptUsageLogs({
    key: selectedKey || undefined,
    limit: 100,
    enabled: !!selectedKey,
  });

  const summaryRows = summaryData?.data || [];
  const logRows = logsData?.data?.rows || [];

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          {selectedKey ? (
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => setSelectedKey(null)}>
              <ArrowLeft size={14} />
              Back to summary
            </Button>
          ) : (
            <>
              <Activity size={18} className="text-primary" />
              <CardTitle className="text-lg font-bold text-gray-900">AI Prompt Usage</CardTitle>
            </>
          )}
          {selectedKey && (
            <span className="font-mono text-sm text-gray-600">{selectedKey}</span>
          )}
        </div>
        {!selectedKey && (
          <span className="text-xs text-gray-400">Click a row to see its full call log</span>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[420px] w-full">
          {selectedKey ? (
            <StyledDataGridPro
              rows={logRows}
              columns={logColumns}
              getRowId={(row) => row.id}
              loading={logsLoading}
              rowHeight={40}
              disableRowSelectionOnClick
              pagination
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              sx={{
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
              }}
            />
          ) : (
            <StyledDataGridPro
              rows={summaryRows}
              columns={summaryColumns}
              getRowId={(row) => `${row.key}-${row.version ?? "none"}`}
              loading={summaryLoading}
              rowHeight={40}
              disableRowSelectionOnClick
              onRowClick={(params) => setSelectedKey(params.row.key)}
              pagination
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              sx={{
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                "& .MuiDataGrid-row": { cursor: "pointer" },
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageAnalyticsSection;
