"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePlacementOverviewQuery } from "@/hooks/api/admin/placement-overview";
import { CrackRow, PerformanceRange, RuleChip, TopBottomEntry } from "@/hooks/api/admin/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StyledDataGridPro } from "@/utils/table";
import { AlertTriangle, LayoutDashboard, LucideIcon, Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { GridToolbar } from "@mui/x-data-grid-pro";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-pro";
import ClientAssignmentDrawer from "../../_components/client-assignment-drawer";

const RANGE_TABS: { key: PerformanceRange; label: string }[] = [
  { key: "1d", label: "Last 1 day" },
  { key: "5d", label: "Last 5 days" },
];

const daysLabel = (days: number | null) => (days === null ? "—" : days < 0 ? `${Math.abs(days)} over` : String(days));
const daysColor = (days: number | null) => (days === null || days < 0 ? "#C23434" : days <= 14 ? "#B4530A" : "#12202D");

function HeroCard({ hero, onScrollToCracks }: { hero: import("@/hooks/api/admin/types").HeroStat; onScrollToCracks: () => void }) {
  const body = (
    <div
      className="h-full rounded-xl border bg-white px-4 py-4 transition-colors hover:border-primary/40"
      style={{ borderColor: hero.tone === "bad" ? "#F5D5D5" : "#E9EEF3" }}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{hero.label}</p>
      <p className="mt-1.5 text-[26px] font-bold leading-none" style={{ color: hero.tone === "bad" ? "#C23434" : "#12202D" }}>
        {hero.value}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{hero.sub}</p>
    </div>
  );

  if (hero.href === "#cracks") {
    return (
      <button type="button" onClick={onScrollToCracks} className="block w-full text-left">
        {body}
      </button>
    );
  }
  if (hero.href) {
    return (
      <Link href={hero.href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 px-4 py-4">
          <Skeleton className="h-[10px] w-16" />
          <Skeleton className="mt-2.5 h-[26px] w-12" />
          <Skeleton className="mt-2 h-[11px] w-20" />
        </div>
      ))}
    </div>
  );
}

const CHIP_TONE: Record<string, { fg: string; bg: string; border: string }> = {
  live: { fg: "#8E2626", bg: "#fff", border: "#E4EAF0" },
  muted: { fg: "#A3B0BD", bg: "#FAFBFC", border: "#EEF2F6" },
};

function CrackChip({ chip }: { chip: RuleChip }) {
  const tone = chip.available ? CHIP_TONE.live : CHIP_TONE.muted;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[12px]"
      style={{ borderColor: tone.border, background: tone.bg }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: chip.available ? (chip.count > 0 ? "#C23434" : "#1EB62D") : "#C7D3DE" }}
      />
      <span className="flex-1 text-gray-700">{chip.label}</span>
      <span className="font-semibold" style={{ color: chip.available ? "#12202D" : "#A3B0BD" }}>
        {chip.available ? chip.count : "no data"}
      </span>
    </div>
  );
}

function PerformerCard({
  title,
  sub,
  entries,
  tone,
  icon: Icon,
}: {
  title: string;
  sub: string;
  entries: TopBottomEntry[];
  tone: "ok" | "bad";
  icon: LucideIcon;
}) {
  const border = tone === "ok" ? "#E4F0E7" : "#F5D5D5";
  const bg = tone === "ok" ? "#F5FBF7" : "#FDF6F6";
  const roleColor = tone === "ok" ? "#177A5E" : "#8E2626";
  const scoreColor = tone === "ok" ? "#157A20" : "#C23434";

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Icon size={16} className={tone === "ok" ? "text-[#177A5E]" : "text-[#8E2626]"} />
          {title}
        </CardTitle>
        <p className="mt-1 text-xs text-gray-500">{sub}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 p-4">
        {entries.map((e) => (
          <div
            key={e.role}
            className="flex items-center gap-3.5 rounded-lg border px-4 py-3"
            style={{ borderColor: border, background: bg }}
          >
            <span className="w-9 shrink-0 text-[10.5px] font-semibold tracking-wide" style={{ color: roleColor }}>
              {e.role}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-gray-900">{e.name || "No one active"}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{e.detail}</p>
            </div>
            {e.score !== null && (
              <span className="text-[19px] font-bold" style={{ color: scoreColor }}>
                {e.score}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function OverviewDashboard() {
  const [range, setRange] = useState<PerformanceRange>("1d");
  const { data, isLoading, isError } = usePlacementOverviewQuery(range);
  const [drawerCredId, setDrawerCredId] = useState<string | null>(null);

  const crackRows = data?.crackRows ?? [];
  const gridRows = useMemo(() => crackRows.map((r, i) => ({ ...r, id: `${r.credId}:${i}` })), [crackRows]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Client",
        flex: 1,
        minWidth: 170,
        renderCell: (params: GridRenderCellParams<CrackRow>) => (
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
        field: "reasons",
        headerName: "Broken rules",
        flex: 1.6,
        minWidth: 260,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<CrackRow>) => (
          <div className="flex flex-wrap gap-1.5 py-1.5">
            {params.row.reasons.map((r: string) => (
              <span
                key={r}
                className="rounded-full bg-[#FDEEEE] px-2 py-0.5 text-[10.5px] font-semibold text-[#8E2626]"
              >
                {r}
              </span>
            ))}
          </div>
        ),
      },
      {
        field: "dpc",
        headerName: "DPC",
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<CrackRow>) => params.row.dpc || "—",
      },
      {
        field: "days",
        headerName: "Days left",
        width: 100,
        align: "right",
        headerAlign: "right",
        renderCell: (params: GridRenderCellParams<CrackRow>) => (
          <span style={{ color: daysColor(params.row.days), fontWeight: 600 }}>{daysLabel(params.row.days)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LayoutDashboard size={18} />
            </span>
            Overview
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
          {isLoading && !data ? (
            <HeroSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {(data?.hero ?? []).map((h) => (
                <HeroCard
                  key={h.key}
                  hero={h}
                  onScrollToCracks={() => document.getElementById("cracks")?.scrollIntoView({ behavior: "smooth" })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isError && (
        <Card className="rounded-xl border-primary/15">
          <CardContent className="p-4">
            <p className="text-xs text-[#C23434]">Couldn&apos;t load the overview — try refreshing the page.</p>
          </CardContent>
        </Card>
      )}

      <Card id="cracks" className="scroll-mt-4 rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <AlertTriangle size={16} className="text-[#B4530A]" />
            Clients falling through the cracks
          </CardTitle>
          <p className="mt-1 text-xs text-gray-500">
            Each client below breaks at least one rule this app can evaluate live.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(data?.crackChips ?? []).map((c) => (
              <CrackChip key={c.id} chip={c} />
            ))}
          </div>

          <div className="h-[380px] w-full">
            <StyledDataGridPro
              disableRowSelectionOnClick
              rows={gridRows}
              columns={columns}
              loading={isLoading}
              rowHeight={56}
              getRowHeight={() => "auto"}
              pagination
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
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

          {data?.crackNote && (
            <p className="rounded-lg border border-[#F2E0A6] bg-[#FFFBEF] px-4 py-2.5 text-xs leading-relaxed text-[#7A5400]">
              {data.crackNote}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PerformerCard
          title="Top of the table"
          sub="Highest scorer in each role"
          entries={data?.topPerformers ?? []}
          tone="ok"
          icon={Trophy}
        />
        <PerformerCard
          title="Bottom of the table"
          sub="Lowest scorer in each role, with what they missed"
          entries={data?.bottomPerformers ?? []}
          tone="bad"
          icon={TrendingDown}
        />
      </div>

      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <TrendingUp size={16} className="text-primary" />
            Funnel
          </CardTitle>
          <p className="mt-1 text-xs text-gray-500">{data?.windowLabel || "Loading window…"}</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex w-full items-stretch gap-2 overflow-x-auto pb-1">
            {(data?.funnel ?? []).map((stage, i) => {
              const prev = i > 0 ? data?.funnel[i - 1] : null;
              const pct = prev && prev.value > 0 ? Math.round((stage.value / prev.value) * 100) : null;
              return (
                <div key={stage.label} className="flex flex-1 items-stretch gap-2">
                  {i > 0 && (
                    <div className="flex shrink-0 flex-col items-center justify-center px-1 text-center">
                      <TrendingDown size={14} className="text-gray-300" />
                      <span className="mt-0.5 whitespace-nowrap text-[11px] font-semibold text-gray-600">
                        {pct ?? "—"}%
                      </span>
                    </div>
                  )}
                  <div className="min-w-[120px] flex-1 rounded-xl border border-[#D3E8F4] bg-[#F3F9FD] px-4 py-3.5 text-center">
                    <p className="text-[22px] font-bold text-[#004174]">{stage.value}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">{stage.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ClientAssignmentDrawer credId={drawerCredId} onClose={() => setDrawerCredId(null)} />
    </div>
  );
}
