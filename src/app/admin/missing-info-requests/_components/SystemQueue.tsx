"use client";

import { useState } from "react";
import { useQueueEntries, QueueEntry } from "@/hooks/api/queue-entry.api";
import QueuePlaceholder from "./QueuePlaceholder";
import SystemActionedModal from "./SystemActionedModal";

const ESCALATION_RUNGS = 4;

function routedLabel(routed: Record<string, unknown> | null): string {
  if (!routed) return "CSM";
  const pcName = typeof routed.pcName === "string" ? routed.pcName : null;
  const csm = typeof routed.csm === "string" ? routed.csm : "CSM";
  return pcName ? `${pcName} · ${csm}` : `${csm} (no PC)`;
}

const STATUS_FILTERS = [
  { key: "", label: "All entries" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Actioned" },
];

/**
 * System queue inside Outstanding Requests (SPR-21-51-003). One row per client
 * action that was mirrored from the notification pipeline; routed to the
 * client's PC + CSM, escalating Slack reminders until marked Actioned with a
 * proof-of-work note. Entries appear ONLY here.
 */
export default function SystemQueue() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actioning, setActioning] = useState<QueueEntry | null>(null);

  const { entries, isLoading, isError } = useQueueEntries("system");

  const filtered = entries
    .filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        (entry.clientName || "").toLowerCase().includes(q) ||
        (entry.clientEmail || "").toLowerCase().includes(q) ||
        (entry.raisedByName || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return 0;
    });

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#9CA3AF] text-[13px]">Loading system entries...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#DC2626] text-[13px]">Failed to load system entries. Try refreshing.</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <QueuePlaceholder
        title="No system entries yet"
        description="Client self-service actions will be recorded and routed here automatically."
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-2.5 mb-4">
        <input
          type="text"
          placeholder="Search by client or action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-none w-[260px] border border-[#E5E9EF] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#D97706]"
        />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
              statusFilter === f.key
                ? "bg-[#FEF3E7] border border-[#D97706] text-[#B45309] font-semibold"
                : "bg-white border border-[#E5E9EF] text-[#1F2937]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E9EF] rounded-xl overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#E5E9EF]">
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Client</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Action</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Routed To</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Sent</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Reminder</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Status</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Requested By</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Actioned By</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isOpen = entry.status === "open";
              return (
                <tr key={entry.id} className="border-b border-[#E5E9EF] last:border-b-0 hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-[#1F2937]">
                    {entry.clientName || entry.clientEmail || "\u2014"}
                  </td>
                  <td className="px-4 py-3.5 text-[#6B7280]">{entry.title}</td>
                  <td className="px-4 py-3.5 text-[#6B7280]">{routedLabel(entry.routedStaff)}</td>
                  <td className="px-4 py-3.5 text-[#6B7280]">
                    {new Date(entry.createdAt).toLocaleString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-[#6B7280]">
                    {entry.escalationLevel > 0 ? `${entry.escalationLevel}/${ESCALATION_RUNGS}` : "\u2014"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider px-2 py-1 rounded-full ${
                        isOpen ? "bg-[#FDF3E7] text-[#B45309]" : "bg-[#ECFDF5] text-[#16A34A]"
                      }`}
                    >
                      {isOpen ? "OPEN" : "ACTIONED"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#6B7280]">{entry.raisedByName}</td>
                  <td className="px-4 py-3.5 text-[#6B7280]">
                    {entry.resolvedByName || "\u2014"}
                    {entry.resolutionNote && (
                      <span className="block text-[11px] text-[#9CA3AF] truncate max-w-[180px]" title={entry.resolutionNote}>
                        {entry.resolutionNote}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {isOpen ? (
                      <button
                        onClick={() => setActioning(entry)}
                        className="border border-[#D97706] bg-white text-[#B45309] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[#FEF3E7] transition-colors"
                      >
                        Actioned
                      </button>
                    ) : (
                      <span className="text-[12px] text-[#9CA3AF]">{"\u2014"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-10">
          <p className="text-gray-400 text-sm">No system entries match this filter.</p>
        </div>
      )}

      <SystemActionedModal entry={actioning} onClose={() => setActioning(null)} />
    </>
  );
}
