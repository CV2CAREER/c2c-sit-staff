"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  useQueueEntries,
  useQueueEntryActions,
  useActivePCs,
  QueueEntry,
} from "@/hooks/api/queue-entry.api";
import AgeIndicator from "./AgeIndicator";
import QueuePlaceholder from "./QueuePlaceholder";

function ageDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const STATUS_FILTERS = [
  { key: "", label: "All tasks" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

/**
 * Staff queue inside Outstanding Requests (SPR-21-51-002).
 * Columns per register DoD: task name, raised by, assigned owner, status,
 * Resolve action (plus Sent/Age/Resolved by from the design artefact).
 * Resolve is manual-only — no automation runs on click.
 */
export default function StaffQueue() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { entries, isLoading, isError } = useQueueEntries("staff");
  const { pcs } = useActivePCs();
  const { assign, resolve } = useQueueEntryActions();

  const filtered = entries
    .filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.raisedByName.toLowerCase().includes(q) ||
        (entry.assignedToName || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return 0;
    });

  const handleAssign = async (entry: QueueEntry, ownerId: string) => {
    if (!ownerId) return;
    const pc = pcs.find((p) => p.id === ownerId);
    if (!pc) return;
    const toastId = toast.loading(`Assigning "${entry.title}" to ${pc.name}...`);
    try {
      await assign({ id: entry.id, ownerId: pc.id, ownerName: pc.name });
      toast.dismiss(toastId);
      toast.success(`Assigned to ${pc.name}.`);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || "Failed to assign owner.");
    }
  };

  const handleResolve = async (entry: QueueEntry) => {
    const toastId = toast.loading(`Resolving "${entry.title}"...`);
    try {
      await resolve({ id: entry.id });
      toast.dismiss(toastId);
      toast.success(`"${entry.title}" resolved. No automation ran.`);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || "Failed to resolve task.");
    }
  };

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#9CA3AF] text-[13px]">Loading staff tasks...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#DC2626] text-[13px]">Failed to load staff tasks. Try refreshing.</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <QueuePlaceholder
        title="No staff tasks yet"
        description="Internal Database (Housekeeping) tasks you raise will appear here."
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-2.5 mb-4">
        <input
          type="text"
          placeholder="Search by task, raiser or owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-none w-[260px] border border-[#E5E9EF] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#7C3AED]"
        />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
              statusFilter === f.key
                ? "bg-[#F3E8FF] border border-[#7C3AED] text-[#7C3AED] font-semibold"
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
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Task</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Requested By</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Assigned To</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Sent</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Age</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Status</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Resolved By</th>
              <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isOpen = entry.status === "open";
              return (
                <tr key={entry.id} className="border-b border-[#E5E9EF] last:border-b-0 hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-[#1F2937]">{entry.title}</td>
                  <td className="px-4 py-3.5 text-[#6B7280]">{entry.raisedByName}</td>
                  <td className="px-4 py-3.5 text-[#6B7280]">
                    {isOpen ? (
                      <select
                        value={entry.assignedToId || ""}
                        onChange={(e) => handleAssign(entry, e.target.value)}
                        className="border border-[#E5E9EF] rounded-lg px-2 py-1 text-[12px] bg-white focus:outline-none focus:border-[#7C3AED]"
                      >
                        <option value="">Unassigned</option>
                        {pcs.map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            {pc.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      entry.assignedToName || "\u2014"
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[#6B7280]">
                    {new Date(entry.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3.5">
                    <AgeIndicator ageDays={ageDays(entry.createdAt)} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider px-2 py-1 rounded-full ${
                        isOpen ? "bg-[#FDF3E7] text-[#B45309]" : "bg-[#ECFDF5] text-[#16A34A]"
                      }`}
                    >
                      {isOpen ? "OPEN" : "RESOLVED"}
                    </span>
                  </td>
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
                        onClick={() => handleResolve(entry)}
                        className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                      >
                        Resolve
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
          <p className="text-gray-400 text-sm">No staff tasks match this filter.</p>
        </div>
      )}
    </>
  );
}
