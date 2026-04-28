"use client";

import React, { useState, useMemo } from "react";
import { GridColDef, GridToolbar, GridRowsProp } from "@mui/x-data-grid-pro";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import TableWithHeaderClass from "@/components/Table";
import SearchInput from "@/components/ui/search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import toast from "react-hot-toast";

const BotLogTable = () => {
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit, setLogsLimit] = useState(50);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsType, setLogsType] = useState("all");

  const { systemLogsDomain } = useAdminQueries({
    fetchSystemLogs: true,
    logsPage,
    logsLimit,
    logsSearch,
    logsType: logsType === "all" ? undefined : logsType,
  });

  const { exportSystemLogsMutation } = useAdminMutations();

  const rows: GridRowsProp = useMemo(() => {
    return systemLogsDomain.data?.result || [];
  }, [systemLogsDomain.data?.result]);

  const totalRows = systemLogsDomain.data?.total || 0;

  const columns: GridColDef[] = [
    {
      field: "timestamp",
      headerName: "Timestamp",
      width: 200,
      renderCell: (params) => {
        if (!params.value) return "N/A";
        return new Date(params.value).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      },
    },
    {
      field: "type",
      headerName: "Type",
      width: 150,
      renderCell: (params) => (
        <span className="capitalize px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          {params.value}
        </span>
      ),
    },
    {
      field: "level",
      headerName: "Level",
      width: 120,
      renderCell: (params) => {
        const color = params.value === "error" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";
        return (
          <span className={`capitalize px-2 py-1 rounded-full ${color} text-xs font-medium`}>
            {params.value}
          </span>
        );
      },
    },
    {
      field: "message",
      headerName: "Message",
      flex: 1,
      minWidth: 300,
    },
    {
      field: "origin",
      headerName: "Origin",
      width: 150,
    },
  ];

  const handleExport = async () => {
    try {
      await toast.promise(
        exportSystemLogsMutation.mutateAsync({
          type: logsType === "all" ? undefined : logsType,
          search: logsSearch,
        }),
        {
          loading: "Exporting logs...",
          success: "Logs exported successfully!",
          error: "Failed to export logs.",
        }
      );
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SearchInput
            searchQuery={logsSearch}
            setSearchQuery={setLogsSearch}
          />
          <Select value={logsType} onValueChange={setLogsType}>
            <SelectTrigger className="w-[250px] bg-white shadow-sm">
              <SelectValue placeholder="Select Logs..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logs</SelectItem>
              <SelectItem value="bot_log">Bot Logs</SelectItem>
              <SelectItem value="ai_log">AI Logs</SelectItem>
              <SelectItem value="cv_ai_log">CV AI Logs</SelectItem>
              <SelectItem value="reed_logs">Reed Logs</SelectItem>
              <SelectItem value="jora_log">Jora Logs</SelectItem>
              <SelectItem value="aq_ai_log">AQ AI Logs</SelectItem>
              <SelectItem value="cv_auto_accept_reject_log">CV Auto Reject Acceptance Logs</SelectItem>
              <SelectItem value="keyword_log">Keyword Generator Logs</SelectItem>
              <SelectItem value="interview_prep_log">Interview Prep Logs</SelectItem>
              <SelectItem value="regression_bot_log">Regression Bot Logs</SelectItem>
              <SelectItem value="digital-traceability-logs">Digital Traceability Logs</SelectItem>
              <SelectItem value="adzuna-logs">Adzuna Logs</SelectItem>
              <SelectItem value="seek-logs">SEEK Logs</SelectItem>
              <SelectItem value="careerone-logs">CareerOne Logs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => systemLogsDomain.refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={exportSystemLogsMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="h-[700px] w-full bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <TableWithHeaderClass
          rows={rows}
          columns={columns}
          loading={systemLogsDomain.isLoading}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={{
            page: logsPage - 1,
            pageSize: logsLimit,
          }}
          onPaginationModelChange={(model) => {
            setLogsPage(model.page + 1);
            setLogsLimit(model.pageSize);
          }}
          pageSizeOptions={[25, 50, 100]}
          slots={{
            toolbar: GridToolbar,
            loadingOverlay: LoadingSpinner,
          }}
          disableRowSelectionOnClick
          getRowId={(row: any) => row._id || row.id || Math.random()}
        />
      </div>
    </div>
  );
};

export default BotLogTable;
