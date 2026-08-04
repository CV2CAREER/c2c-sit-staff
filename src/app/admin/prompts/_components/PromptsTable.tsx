"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { GridColDef } from "@mui/x-data-grid-pro";
import { LucideIcon, Layers, CheckCircle2, PauseCircle, Archive, Pencil, RotateCcw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledDataGridPro } from "@/utils/table";
import {
  useVcsPrompts,
  useDeletedVcsPrompts,
  useRestoreVcsPrompt,
  VcsPrompt,
} from "../hooks/use-vcs-prompts";
import {
  getEnabledStatus,
  EnabledStatus,
  ENABLED_STATUS_BADGE_CLASS,
  ENABLED_STATUS_LABEL,
} from "./promptStatus";
import RecentlyEditedList from "./RecentlyEditedList";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

type FilterValue = "all" | EnabledStatus;

interface PromptsTableProps {
  onEdit: (prompt: VcsPrompt) => void;
}

const PromptsTable = ({ onEdit }: PromptsTableProps) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("all");

  const { data: vcsData, isLoading } = useVcsPrompts();
  const { data: deletedData, isLoading: isDeletedLoading } = useDeletedVcsPrompts(true);
  const { mutateAsync: restorePrompt, isPending: isRestoring } = useRestoreVcsPrompt();

  const nonDeleted = useMemo(() => vcsData?.data || [], [vcsData]);
  const deleted = useMemo(() => deletedData?.data || [], [deletedData]);
  const allPrompts = useMemo(() => [...nonDeleted, ...deleted], [nonDeleted, deleted]);

  const counts = useMemo(
    () => ({
      all: allPrompts.length,
      enabled: nonDeleted.filter((p) => p.active).length,
      disabled: nonDeleted.filter((p) => !p.active).length,
      archived: deleted.length,
    }),
    [allPrompts, nonDeleted, deleted],
  );

  const rows = useMemo(() => {
    if (filter === "all") return allPrompts;
    return allPrompts.filter((p) => getEnabledStatus(p) === filter);
  }, [allPrompts, filter]);

  const handleRestore = async (prompt: VcsPrompt) => {
    try {
      await restorePrompt({ id: prompt.id });
      toast.success(`"${prompt.key}" restored.`);
      queryClient.invalidateQueries({ queryKey: ["vcs-prompts"] });
    } catch (error: any) {
      toast.error(error?.message || "Failed to restore prompt.");
    }
  };

  const columns: GridColDef[] = [
    { field: "key", headerName: "Key", flex: 1, minWidth: 220 },
    {
      field: "version",
      headerName: "Version",
      width: 100,
      valueFormatter: (value) => (value ? `v${value}` : "—"),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      valueGetter: (_value, row) => getEnabledStatus(row),
      renderCell: (params) => {
        const status = params.value as EnabledStatus;
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ENABLED_STATUS_BADGE_CLASS[status]}`}
          >
            {ENABLED_STATUS_LABEL[status]}
          </span>
        );
      },
    },
    {
      field: "updatedAt",
      headerName: "Updated",
      width: 180,
      valueFormatter: (value) => formatDate(value as string),
    },
    {
      field: "updatedBy",
      headerName: "Last edited by",
      width: 160,
      valueFormatter: (value) => (value as string) || "System",
    },
    {
      field: "actions",
      headerName: "",
      width: 70,
      sortable: false,
      renderCell: (params) => {
        const prompt = params.row as VcsPrompt;
        if (prompt.deletedAt) {
          return (
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={isRestoring}
              title="Restore"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(prompt);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          );
        }
        return (
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  const cardsData: { value: FilterValue; title: string; count: number; icon: { name: LucideIcon; bgColor: string; color: string } }[] = [
    {
      value: "all",
      title: "All Prompts",
      count: counts.all,
      icon: { name: Layers, bgColor: "bg-lightblue", color: "text-blue" },
    },
    {
      value: "enabled",
      title: "Enabled",
      count: counts.enabled,
      icon: { name: CheckCircle2, bgColor: "bg-green-200", color: "text-green-700" },
    },
    {
      value: "disabled",
      title: "Disabled",
      count: counts.disabled,
      icon: { name: PauseCircle, bgColor: "bg-yellow-200", color: "text-yellow-700" },
    },
    {
      value: "archived",
      title: "Archived",
      count: counts.archived,
      icon: { name: Archive, bgColor: "bg-gray-200", color: "text-gray-700" },
    },
  ];

  const loading = isLoading || isDeletedLoading;

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {cardsData.map((card) => {
            const LIcon = card.icon.name;
            const isActive = filter === card.value;
            return (
              <div
                key={card.value}
                onClick={() => setFilter(card.value)}
                className={`flex items-center min-w-0 gap-2 p-3 rounded-xl cursor-pointer transition-colors ${
                  isActive ? "bg-primary/10 ring-1 ring-primary/30" : "bg-gray-50 hover:bg-primary/5"
                }`}
              >
                <div className={`${card.icon.bgColor} w-fit p-2 rounded-full`}>
                  <LIcon className={card.icon.color} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1 break-words leading-tight">
                    {card.title}
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900 leading-none">{card.count}</h1>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch">
        <Card className="min-w-0 flex-1 rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-[360px] w-full" />
              </div>
            ) : allPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-base font-medium text-gray-800">No prompts yet</p>
                <p className="max-w-sm text-sm text-gray-500">
                  Create the first key-based prompt to start driving AI generation across the
                  platform.
                </p>
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <StyledDataGridPro
                  rows={rows}
                  columns={columns}
                  getRowId={(row) => row.id}
                  rowHeight={44}
                  disableRowSelectionOnClick
                  onRowClick={(params) => {
                    const prompt = params.row as VcsPrompt;
                    if (!prompt.deletedAt) onEdit(prompt);
                  }}
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
              </div>
            )}
          </CardContent>
        </Card>

        <RecentlyEditedList prompts={nonDeleted} onSelect={onEdit} />
      </div>
    </div>
  );
};

export default PromptsTable;
