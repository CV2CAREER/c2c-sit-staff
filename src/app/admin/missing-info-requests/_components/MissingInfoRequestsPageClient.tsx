"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useOutstandingRequests,
  useRequestStats,
  useBulkReminder,
  OutstandingRequest,
} from "@/hooks/api/missing-info-template.api";
import RequestStatusBadge from "./RequestStatusBadge";
import AgeIndicator from "./AgeIndicator";
import BulkReminderModal from "./BulkReminderModal";
import ViewResponsesModal from "./ViewResponsesModal";
import EmptyState from "./EmptyState";

const AGE_FILTERS = [
  { key: "", label: "All pending" },
  { key: "3", label: ">3 days" },
  { key: "7", label: ">7 days" },
];

const STATUS_FILTERS = [
  { key: "", label: "All requests" },
  { key: "pending", label: "Pending" },
  { key: "viewed", label: "Viewed" },
  { key: "in_progress", label: "In progress" },
  { key: "submitted", label: "Submitted" },
];

export default function MissingInfoRequestsPageClient() {
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [viewRequestId, setViewRequestId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const param = searchParams.get("request");
    if (param) {
      setViewRequestId(param);
    }
  }, [searchParams]);

  const { data: requests, pagination, isLoading } = useOutstandingRequests({
    age: ageFilter || undefined,
    status: statusFilter || undefined,
  });

  const { stats } = useRequestStats();
  const { sendBulkReminder, isSending } = useBulkReminder();

  const filteredRequests = (requests || []).filter((req) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      req.clientName.toLowerCase().includes(q) ||
      req.clientEmail?.toLowerCase().includes(q) ||
      req.templateName?.toLowerCase().includes(q) ||
      req.templateId?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)));
    }
  };

  const handleBulkReminder = async () => {
    const toast = (await import("react-hot-toast")).default;
    const toastId = toast.loading("Sending reminders...");
    try {
      await sendBulkReminder(Array.from(selectedIds));
      toast.dismiss(toastId);
      toast.success(
        `Reminder sent to ${selectedIds.size} client${selectedIds.size !== 1 ? "s" : ""}.`,
      );
      setSelectedIds(new Set());
      setBulkModalOpen(false);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || "Failed to send reminders.");
    }
  };

  const handleResend = async (req: OutstandingRequest) => {
    const toast = (await import("react-hot-toast")).default;
    const toastId = toast.loading(`Resending to ${req.clientName}...`);
    try {
      await sendBulkReminder([req.id]);
      toast.dismiss(toastId);
      toast.success(`Reminder sent to ${req.clientName}.`);
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to resend.");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#F3F4F6] min-h-screen">
        <div className="bg-white px-7 py-3.5 border-b border-[#E5E9EF]">
          <h1 className="text-[20px] font-bold text-[#10365A] m-0">Missing Information Request</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <p className="text-[#9CA3AF] text-[13px]">Loading requests...</p>
        </div>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-[#F3F4F6] min-h-screen">
        <div className="bg-white px-7 py-3.5 border-b border-[#E5E9EF]">
          <h1 className="text-[20px] font-bold text-[#10365A] m-0">Missing Information Request</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      {/* Header */}
      <div className="bg-white px-7 py-4 border-b border-[#E5E9EF]">
        <div className="flex items-center gap-3">
          <a
            href="/admin/missing-info-templates"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E9EF] transition-colors text-[#10365A]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <h1 className="text-[20px] font-bold text-[#10365A] m-0">Missing Information Request</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-6 bg-white px-7 py-3.5 border-b border-[#E5E9EF]">
        <span className="text-[13px] font-semibold text-[#0B96D6] border-b-2 border-[#0B96D6] pb-1">
          All Requests{" "}
          <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-[#0B96D6] text-white">
            {stats.total}
          </span>
        </span>
        <Link
          href="/admin/missing-info-templates"
          className="text-[13px] font-semibold text-[#6B7280] hover:text-[#1F2937] pb-1 transition-colors"
        >
          Templates{" "}
          <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-[#EAF4FE] text-[#0B96D6]">
            {stats.templateCount}
          </span>
        </Link>
        <div className="flex-1" />
        <Link
          href="/admin/missing-info-templates"
          className="inline-flex items-center gap-1.5 border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          View All Templates{" "}
          <span className="ml-0.5 text-[#9CA3AF]">{stats.templateCount}</span>
        </Link>
        <Link
          href="/admin/missing-info-templates"
          className="inline-flex items-center gap-1.5 bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors"
        >
          + New Request
        </Link>
      </div>

      <div className="px-7 py-5">
        {/* Filters row */}
        <div className="flex items-center gap-2.5 mb-4">
          <input
            type="text"
            placeholder="Search by client or template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-0-0-[260px] border border-[#E5E9EF] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#0B96D6]"
          />
          {AGE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setAgeFilter(f.key)}
              className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                ageFilter === f.key
                  ? "bg-[#EAF6FF] border border-[#0B96D6] text-[#0B96D6] font-semibold"
                  : "bg-white border border-[#E5E9EF] text-[#1F2937]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px h-5 bg-[#E5E9EF]" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                statusFilter === f.key
                  ? "bg-[#EAF6FF] border border-[#0B96D6] text-[#0B96D6] font-semibold"
                  : "bg-white border border-[#E5E9EF] text-[#1F2937]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors"
            >
              Bulk reminder
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E5E9EF] rounded-xl overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E5E9EF]">
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4"
                  />
                </th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Client</th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Template</th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Requested By</th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Sent</th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Age</th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Reminders</th>
                <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => {
                const isChecked = selectedIds.has(req.id);
                return (
                  <tr
                    key={req.id}
                    className={`border-b border-[#E5E9EF] last:border-b-0 transition-colors ${
                      isChecked ? "bg-[#EAF6FF]" : "hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(req.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#1F2937]">{req.clientName}</td>
                    <td className="px-4 py-3.5 text-[#6B7280]">{req.templateName || req.templateId?.slice(0, 8)}...</td>
                    <td className="px-4 py-3.5 text-[#6B7280]">{req.requestedByName || "\u2014"}</td>
                    <td className="px-4 py-3.5 text-[#6B7280]">
                      {new Date(req.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <AgeIndicator ageDays={req.ageDays} />
                    </td>
                    <td className="px-4 py-3.5 text-[#6B7280]">
                      {req.reminderCount > 0 ? `${req.reminderCount} sent` : "\u2014"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {req.status === "submitted" && (
                          <button
                            onClick={() => setViewRequestId(req.id)}
                            className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                          >
                            View responses
                          </button>
                        )}
                        <button
                          onClick={() => handleResend(req)}
                          className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                        >
                          Resend
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-[12px] text-[#9CA3AF]">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-[12px] bg-[#F3F4F6] rounded-lg disabled:opacity-40 font-medium"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-[12px] bg-[#F3F4F6] rounded-lg disabled:opacity-40 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk reminder modal */}
      <BulkReminderModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        count={selectedIds.size}
        selectedRequests={filteredRequests.filter((r) => selectedIds.has(r.id))}
        onConfirm={handleBulkReminder}
        isSending={isSending}
      />

      {/* View responses modal */}
      <ViewResponsesModal
        open={viewRequestId !== null}
        requestId={viewRequestId}
        onClose={() => setViewRequestId(null)}
      />
    </div>
  );
}
