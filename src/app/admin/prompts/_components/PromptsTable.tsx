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
import { useVcsPromptLastUsed } from "../hooks/use-vcs-prompt-usage";
import {
  getEnabledStatus,
  EnabledStatus,
  ENABLED_STATUS_BADGE_CLASS,
  ENABLED_STATUS_LABEL,
} from "./promptStatus";
import { getPromptUsedByLabel } from "./promptUsedBy";
import RecentlyEditedList from "./RecentlyEditedList";
import { columnHeaderHint } from "./HintMark";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatRelativeTime = (value: string | null | undefined) => {
  if (!value) return "Never";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return diffSec <= 5 ? "Just now" : `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return formatDate(value);
};

type FilterValue = "all" | EnabledStatus;

interface PromptsTableProps {
  onEdit: (prompt: VcsPrompt) => void;
}

const PromptsTable = ({ onEdit }: PromptsTableProps) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("all");

  const { data: vcsData, isLoading } = useVcsPrompts();
  const { data: deletedData, isLoading: isDeletedLoading } = useDeletedVcsPrompts(true);
  const { data: lastUsedData } = useVcsPromptLastUsed();
  const { mutateAsync: restorePrompt, isPending: isRestoring } = useRestoreVcsPrompt();

  const lastUsedByKey = useMemo(() => {
    const map = new Map<string, string | null>();
    (lastUsedData?.data || []).forEach((row) => map.set(row.key, row.lastUsedAt));
    return map;
  }, [lastUsedData]);

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
    {
      field: "key",
      headerName: "Key",
      flex: 1,
      minWidth: 220,
      renderHeader: () =>
        columnHeaderHint("Key", "The lookup key backend services use to fetch this prompt."),
    },
    {
      field: "version",
      headerName: "Version",
      width: 100,
      valueFormatter: (value) => (value ? `v${value}` : "—"),
      renderHeader: () =>
        columnHeaderHint("Version", "The version number of what's currently live for this key."),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      valueGetter: (_value, row) => getEnabledStatus(row),
      renderHeader: () =>
        columnHeaderHint(
          "Status",
          "Enabled prompts are used when called, Disabled ones are skipped, Archived ones were soft-deleted.",
        ),
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
      field: "usedBy",
      headerName: "Used By",
      width: 220,
      valueGetter: (_value, row) => getPromptUsedByLabel((row as VcsPrompt).key),
      renderHeader: () =>
        columnHeaderHint("Used By", "The feature or service that calls this prompt key."),
    },
    {
      field: "lastUsedAt",
      headerName: "Last Used",
      width: 160,
      valueGetter: (_value, row) => lastUsedByKey.get((row as VcsPrompt).key) ?? null,
      renderHeader: () =>
        columnHeaderHint("Last Used", "How recently the AI actually called this prompt in production."),
      renderCell: (params) => (
        <span title={params.value ? formatDate(params.value as string) : undefined}>
          {formatRelativeTime(params.value as string | null)}
        </span>
      ),
    },
    {
      field: "updatedAt",
      headerName: "Updated",
      width: 180,
      valueFormatter: (value) => formatDate(value as string),
      renderHeader: () =>
        columnHeaderHint("Updated", "When this prompt's draft or live version was last changed."),
    },
    {
      field: "updatedBy",
      headerName: "Last edited by",
      width: 160,
      valueFormatter: (value) => (value as string) || "System",
      renderHeader: () =>
        columnHeaderHint("Last edited by", "The staff member (or System) who made the most recent change."),
    },
    {
      field: "actions",
      headerName: "",
      width: 70,
      sortable: false,
      renderHeader: () => columnHeaderHint("", "Edit opens this prompt; the restore icon un-archives a deleted key."),
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

        {/* <RecentlyEditedList prompts={nonDeleted} onSelect={onEdit} /> */}
      </div>
    </div>
  );
};

export default PromptsTable;
