"use client";
import { useMemo, useState } from "react";
import { usePlacementPerformanceQuery } from "@/hooks/api/admin/placement-performance";
import { BookClient, DayCard, DpcPerformanceRow, PerformanceRange, SpcPerformanceRow, Standing, VpcPerformanceRow } from "@/hooks/api/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledDataGridPro } from "@/utils/table";
import { TrendingUp } from "lucide-react";
import type { GridColDef, GridRenderCellParams, GridRowId, GridRowParams } from "@mui/x-data-grid-pro";

const RANGE_TABS: { key: PerformanceRange; label: string }[] = [
  { key: "1d", label: "Last 1 day" },
  { key: "5d", label: "Last 5 days" },
];

const scoreColor = (score: number) => (score >= 85 ? "#157A20" : score >= 70 ? "#B07908" : "#C23434");

function ScoreCell({ value }: { value: number }) {
  return <span style={{ color: scoreColor(value), fontWeight: 700 }}>{value}%</span>;
}

function rankColumn(): GridColDef {
  return {
    field: "rank",
    headerName: "#",
    width: 56,
    sortable: false,
    filterable: false,
    renderCell: (params: GridRenderCellParams) => (
      <span className="text-gray-400">{params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}</span>
    ),
  };
}

function nameColumn(): GridColDef {
  return {
    field: "name",
    headerName: "Controller",
    flex: 1.2,
    minWidth: 180,
    renderCell: (params: GridRenderCellParams) => (
      <span className="truncate text-[13px] font-semibold text-gray-900">{params.row.name}</span>
    ),
  };
}

// Reconstructed from the reference console's own embedded per-cell red-flag
// thresholds (its exact "Standing" verdict was computed by an external
// report upload not present in this codebase — see the backend service).
function standingColumn(): GridColDef {
  return {
    field: "standing",
    headerName: "Standing",
    flex: 1,
    minWidth: 200,
    sortable: false,
    filterable: false,
    renderCell: (params: GridRenderCellParams) => {
      const standing: Standing = params.row.standing;
      const ok = standing.met;
      return (
        <span
          className="inline-flex items-center gap-1.5 truncate text-[11.5px] font-medium"
          style={{ color: ok ? "#157A20" : "#8E2626" }}
          title={ok ? "Met all standards" : `Missed: ${standing.missed.join(", ")}`}
        >
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: ok ? "#1EB62D" : "#C23434" }}
          />
          {ok ? "Met all standards" : `Missed: ${standing.missed.join(", ")}`}
        </span>
      );
    },
  };
}

const daysLabel = (days: number | null) => (days === null ? "no date" : days < 0 ? `${Math.abs(days)}d over` : days <= 30 ? `${days}d` : "");
const daysTone = (days: number | null) =>
  days === null || days < 0
    ? { fg: "#8E2626", bg: "#FDF6F6", border: "#F5D5D5" }
    : days <= 30
      ? { fg: "#7A5400", bg: "#FFFBF0", border: "#F2E0A6" }
      : { fg: "#12202D", bg: "#F7F9FB", border: "#E9EEF3" };

// The attached-client "book" for a controller row — a dropdown/expand panel
// listing every client currently assigned to them, matching the reference
// console's row-expand pattern.
function BookPanel({ book }: { book: BookClient[] }) {
  if (book.length === 0) {
    return <p className="px-5 py-3 text-xs text-gray-400">No clients currently assigned.</p>;
  }
  const overdue = book.filter((c) => c.days !== null && c.days <= 30).length;
  return (
    <div className="bg-[#FAFCFD] px-5 py-4">
      <p className="mb-2.5 text-[11px] uppercase tracking-wide text-gray-400">
        {book.length} active client{book.length === 1 ? "" : "s"} carried
      </p>
      <div className="flex flex-wrap gap-2">
        {book.map((c) => {
          const tag = daysLabel(c.days);
          const tone = daysTone(c.days);
          return (
            <div
              key={c.clientId}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: tone.border, background: "#fff" }}
            >
              <span className="font-medium text-gray-800">{c.name}</span>
              {tag && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ color: tone.fg, background: tone.bg }}
                >
                  {tag}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {overdue > 0 && (
        <p className="mt-3 text-[11.5px] text-gray-500">
          {overdue} of {book.length} need a renewal decision inside 30 days.
        </p>
      )}
    </div>
  );
}

// Live replacement for the reference console's manual-export day strip —
// real submitted-per-day totals for the last 5 calendar days, no upload
// required. A quiet day shows 0 rather than "awaiting export".
function DayStrip({ headline, dayCards }: { headline: string; dayCards: DayCard[] }) {
  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardContent className="p-4">
        <p className="text-[15px] leading-relaxed text-gray-800">{headline}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {dayCards.map((d) => {
            const active = d.value > 0;
            return (
              <div
                key={d.date}
                className="min-w-[124px] flex-1 rounded-xl border px-4 py-3.5"
                style={{
                  borderColor: d.isLatestActive ? "#008ED3" : active ? "#D3E8F4" : "#EEF2F6",
                  background: active ? "#F3F9FD" : "#FAFBFC",
                }}
              >
                <p className="text-[10.5px] uppercase tracking-wide text-gray-400">{d.dow}</p>
                <p className="mt-0.5 text-[12.5px] font-semibold text-gray-800">{d.label}</p>
                <p
                  className="mt-1.5 text-[22px] font-bold"
                  style={{ color: active ? "#004174" : "#C7D3DE" }}
                >
                  {d.value || "—"}
                </p>
                <p className="mt-0.5 text-[10.5px] text-gray-400">
                  {d.isLatestActive ? "latest activity" : active ? "submitted" : "no activity"}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DayStripSkeleton() {
  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardContent className="p-4">
        <Skeleton className="h-[19px] w-3/4" />
        <div className="mt-4 flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[124px] flex-1 rounded-xl border border-gray-100 px-4 py-3.5">
              <Skeleton className="h-[11px] w-8" />
              <Skeleton className="mt-2 h-[13px] w-14" />
              <Skeleton className="mt-2.5 h-[22px] w-10" />
              <Skeleton className="mt-2 h-[11px] w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformanceTables() {
  const [range, setRange] = useState<PerformanceRange>("1d");
  const { data, isLoading, isError } = usePlacementPerformanceQuery(range);

  // Which controller rows have their client book expanded — one set per
  // league table, since row ids (controller names) aren't unique across tables.
  const [dpcExpanded, setDpcExpanded] = useState<Set<GridRowId>>(new Set());
  const [vpcExpanded, setVpcExpanded] = useState<Set<GridRowId>>(new Set());
  const [spcExpanded, setSpcExpanded] = useState<Set<GridRowId>>(new Set());

  const dpcRows = useMemo(() => (data?.dpc ?? []).map((r) => ({ ...r, id: r.name })), [data]);
  const vpcRows = useMemo(() => (data?.vpc ?? []).map((r) => ({ ...r, id: r.name })), [data]);
  const spcRows = useMemo(() => (data?.spc ?? []).map((r) => ({ ...r, id: r.name })), [data]);

  const dpcColumns: GridColDef[] = useMemo(
    () => [
      rankColumn(),
      nameColumn(),
      {
        field: "score",
        headerName: "Score",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<DpcPerformanceRow>) => <ScoreCell value={params.row.score} />,
      },
      {
        field: "jobs",
        headerName: "Jobs",
        width: 90,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<DpcPerformanceRow>) => params.row.jobs,
      },
      {
        field: "clientsAt15",
        headerName: "Clients at 15+",
        width: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<DpcPerformanceRow>) =>
          `${params.row.clientsAt15} / ${params.row.clientsAssigned}`,
      },
      {
        field: "vetThrough",
        headerName: "Vet-through",
        width: 120,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<DpcPerformanceRow>) => `${params.row.vetThrough}%`,
      },
      {
        field: "lqaRate",
        headerName: "LQA",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<DpcPerformanceRow>) => (
          <span style={{ color: params.row.lqaRate > 15 ? "#C23434" : "#12202D", fontWeight: 600 }}>
            {params.row.lqaRate}%
          </span>
        ),
      },
      standingColumn(),
    ],
    [],
  );

  const vpcColumns: GridColDef[] = useMemo(
    () => [
      rankColumn(),
      nameColumn(),
      {
        field: "score",
        headerName: "Score",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<VpcPerformanceRow>) => <ScoreCell value={params.row.score} />,
      },
      {
        field: "vetted",
        headerName: "Vetted",
        width: 90,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<VpcPerformanceRow>) => params.row.vetted,
      },
      {
        field: "queue",
        headerName: "In queue",
        width: 140,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params: GridRenderCellParams<VpcPerformanceRow>) => (
          <span style={{ color: params.row.queueScore < 100 ? "#B4530A" : "#12202D" }}>
            {params.row.queueScore}% ({params.row.queueEntries})
          </span>
        ),
      },
      {
        field: "hml",
        headerName: "H / M / L",
        width: 130,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params: GridRenderCellParams<VpcPerformanceRow>) =>
          `${params.row.high} / ${params.row.med} / ${params.row.low}`,
      },
      standingColumn(),
    ],
    [],
  );

  const spcColumns: GridColDef[] = useMemo(
    () => [
      rankColumn(),
      nameColumn(),
      {
        field: "score",
        headerName: "Score",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<SpcPerformanceRow>) => <ScoreCell value={params.row.score} />,
      },
      {
        field: "submitted",
        headerName: "Submitted",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<SpcPerformanceRow>) => params.row.submitted,
      },
      {
        field: "queue",
        headerName: "In queue",
        width: 140,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params: GridRenderCellParams<SpcPerformanceRow>) => (
          <span style={{ color: params.row.queueScore < 100 ? "#B4530A" : "#12202D" }}>
            {params.row.queueScore}% ({params.row.queueEntries})
          </span>
        ),
      },
      {
        field: "clientsClear",
        headerName: "Clients clear",
        width: 130,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<SpcPerformanceRow>) =>
          `${params.row.clientsClear} / ${params.row.clientsAssigned}`,
      },
      standingColumn(),
    ],
    [],
  );

  const leagues: {
    title: string;
    standard: string;
    rows: any[];
    columns: GridColDef[];
    expanded: Set<GridRowId>;
    setExpanded: (ids: Set<GridRowId>) => void;
  }[] = [
    {
      title: "Discovery — DPC",
      standard: "Score = clients with 15+ jobs added this window ÷ clients assigned",
      rows: dpcRows,
      columns: dpcColumns,
      expanded: dpcExpanded,
      setExpanded: setDpcExpanded,
    },
    {
      title: "Vetting — VPC",
      standard: "Score = jobs vetted this window ÷ 240 standard",
      rows: vpcRows,
      columns: vpcColumns,
      expanded: vpcExpanded,
      setExpanded: setVpcExpanded,
    },
    {
      title: "Submission — SPC",
      standard: "Score = jobs submitted this window ÷ 240 standard",
      rows: spcRows,
      columns: spcColumns,
      expanded: spcExpanded,
      setExpanded: setSpcExpanded,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TrendingUp size={18} />
            </span>
            Placement Performance
          </CardTitle>
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {RANGE_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setRange(t.key)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  range === t.key ? "bg-primary text-white" : "text-gray-600 hover:bg-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-xs text-gray-500">
            {data?.windowLabel || "Loading window…"} · ranked by activity within the window
          </p>
        </CardContent>
      </Card>

      {isError && (
        <Card className="rounded-xl border-primary/15">
          <CardContent className="p-4">
            <p className="text-xs text-[#C23434]">Couldn&apos;t load placement performance — try refreshing the page.</p>
          </CardContent>
        </Card>
      )}

      {data ? (
        <DayStrip headline={data.headline} dayCards={data.dayCards} />
      ) : isLoading ? (
        <DayStripSkeleton />
      ) : null}

      {leagues.map((league) => (
        <Card key={league.title} className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <CardHeader className="border-b border-gray-100 p-4">
            <CardTitle className="text-base font-bold text-gray-900">{league.title}</CardTitle>
            <p className="mt-1 text-xs text-gray-500">{league.standard}</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[420px] w-full">
              <StyledDataGridPro
                disableRowSelectionOnClick
                rows={league.rows}
                columns={league.columns}
                loading={isLoading}
                rowHeight={48}
                hideFooter={league.rows.length <= 10}
                pagination
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                getDetailPanelContent={(params: GridRowParams) => <BookPanel book={params.row.book} />}
                getDetailPanelHeight={() => "auto" as const}
                detailPanelExpandedRowIds={league.expanded}
                onDetailPanelExpandedRowIdsChange={(ids: Set<GridRowId>) => league.setExpanded(new Set(ids))}
                sx={{
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                  "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
                }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
