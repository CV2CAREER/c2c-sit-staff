"use client";

import { useState } from "react";
import {
  useOutstandingRequests,
  useRequestStats,
  useBulkReminder,
  useRequestResponses,
  OutstandingRequest,
} from "@/hooks/api/missing-info-template.api";
import AgeIndicator from "./AgeIndicator";
import BulkReminderModal from "./BulkReminderModal";
import ViewResponsesModal from "./ViewResponsesModal";
import EmptyState from "./EmptyState";
import QueuePlaceholder from "./QueuePlaceholder";

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

type Queue = "customer" | "staff" | "system";

const QUEUE_TABS: { key: Queue; label: string; accent: string }[] = [
  { key: "customer", label: "Customer", accent: "#0B96D6" },
  { key: "staff", label: "Staff", accent: "#7C3AED" },
  { key: "system", label: "System", accent: "#D97706" },
];

export default function MissingInfoRequestsPageClient({
  onSwitchScreen,
}: {
  onSwitchScreen?: (screen: "templates" | "requests") => void;
}) {
  const [queue, setQueue] = useState<Queue>("customer");
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [viewResponsesId, setViewResponsesId] = useState<string | null>(null);

  const { data: requests, pagination, isLoading } = useOutstandingRequests({
    age: ageFilter || undefined,
    status: statusFilter || undefined,
  });

  const { stats } = useRequestStats();
  const { sendBulkReminder, isSending } = useBulkReminder();

  const { data: responsesData, isLoading: isResponsesLoading } = useRequestResponses(
    viewResponsesId || ""
  );

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

  const handleViewResponses = (id: string) => {
    setViewResponsesId(id);
  };

  const queueCounts: Record<Queue, number> = {
    customer: stats.total,
    // Filled in by SPR-21-51-002 (Staff) and SPR-21-51-003 (System)
    staff: 0,
    system: 0,
  };

  return (
    <div className="bg-[#F3F4F6]">
      {/* Queue tabs */}
      <div className="flex items-center gap-2.5 bg-white px-7 py-3.5 border-b border-[#E5E9EF]">
        {QUEUE_TABS.map((tab) => {
          const active = queue === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setQueue(tab.key)}
              className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors ${
                active ? "text-white" : "bg-white text-[#1F2937] border-[#E5E9EF] hover:border-[#0B96D6]"
              }`}
              style={active ? { backgroundColor: tab.accent, borderColor: tab.accent } : undefined}
            >
              {tab.label}{" "}
              <span
                className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-full ${
                  active ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                }`}
              >
                {queueCounts[tab.key]}
              </span>
            </button>
          );
        })}
        <div className="flex-1" />
        {queue === "customer" && onSwitchScreen && (
          <button
            onClick={() => onSwitchScreen("templates")}
            className="inline-flex items-center gap-1.5 bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors"
          >
            + New Request
          </button>
        )}
      </div>

      {/* Customer queue — the existing outstanding-requests list */}
      {queue === "customer" && (
        <div className="px-7 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-[#9CA3AF] text-[13px]">Loading requests...</p>
            </div>
          ) : !requests || requests.length === 0 ? (
            <EmptyState onNewRequest={() => onSwitchScreen?.("templates")} />
          ) : (
            <>
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleResend(req)}
                                className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                              >
                                Resend
                              </button>
                              {req.status === "submitted" && (
                                <button
                                  onClick={() => handleViewResponses(req.id)}
                                  className="border border-[#E5E9EF] bg-white text-[#0B96D6] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[#EAF6FF] transition-colors"
                                >
                                  View Responses
                                </button>
                              )}
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
            </>
          )}
        </div>
      )}

      {/* Staff queue — built by SPR-21-51-002 */}
      {queue === "staff" && (
        <div className="px-7 py-5">
          <QueuePlaceholder
            title="No staff tasks yet"
            description="Internal Database (Housekeeping) tasks you raise will appear here."
          />
        </div>
      )}

      {/* System queue — built by SPR-21-51-003 */}
      {queue === "system" && (
        <div className="px-7 py-5">
          <QueuePlaceholder
            title="No system entries yet"
            description="Client self-service actions will be recorded and routed here."
          />
        </div>
      )}

      {/* Bulk reminder modal */}
      <BulkReminderModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        count={selectedIds.size}
        selectedRequests={filteredRequests.filter((r) => selectedIds.has(r.id))}
        onConfirm={handleBulkReminder}
        isSending={isSending}
      />

      {/* View Responses Modal */}
      <ViewResponsesModal
        open={viewResponsesId !== null}
        onClose={() => setViewResponsesId(null)}
        data={responsesData}
        isLoading={isResponsesLoading}
      />
    </div>
  );
}
