"use client";

import React, { useState, useMemo } from "react";
import { Search, CheckCircle2, Clock, XCircle, MoreVertical } from "lucide-react";
import toast from "react-hot-toast";
import {
  useJobsiteVerificationQueue,
} from "@/hooks/api/jobsite-verification.api";
import {
  JobsiteVerification,
  JobsiteVerificationStatus,
} from "@/types/jobsite-verification.types";
import ProofModal from "./ProofModal";
import RejectModal from "./RejectModal";
import ExemptModal from "./ExemptModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FilterStatus = "all" | "pending" | "verified" | "rejected" | "exempt";

export default function JobsiteReviewView() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals state
  const [proofModalData, setProofModalData] = useState<{
    isOpen: boolean;
    jobsiteName: string;
    clientName: string;
    proofFileRef?: string | null;
  }>({
    isOpen: false,
    jobsiteName: "",
    clientName: "",
    proofFileRef: null,
  });

  const [rejectModalData, setRejectModalData] = useState<{
    isOpen: boolean;
    id: string;
    jobsiteName: string;
  }>({
    isOpen: false,
    id: "",
    jobsiteName: "",
  });

  const [exemptModalData, setExemptModalData] = useState<{
    isOpen: boolean;
    isBulk: boolean;
    id?: string;
    clientId?: string;
    clientName?: string;
    jobsiteId?: string;
    country?: string;
  }>({
    isOpen: false,
    isBulk: false,
  });

  const { listDomain, actions } = useJobsiteVerificationQueue({
    status: statusFilter,
    search: searchTerm,
  });

  const items = listDomain.items;
  const stats = listDomain.stats;

  // Real-time client-side combined filter with date sorting (newest first)
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const name = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.toLowerCase();
        const email = (item.client?.email || "").toLowerCase();
        const jobsite = item.jobsiteId.toLowerCase();
        return name.includes(q) || email.includes(q) || jobsite.includes(q);
      });
    }

    // Sort newest first by submittedAt or createdAt
    result.sort((a, b) => {
      const timeA = new Date(a.submittedAt || (a.createdAt as any) || 0).getTime();
      const timeB = new Date(b.submittedAt || (b.createdAt as any) || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [items, statusFilter, searchTerm]);

  // Counts for level 3 tabs
  const counts = useMemo(() => {
    return {
      all: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      verified: items.filter((i) => i.status === "verified").length,
      rejected: items.filter((i) => i.status === "rejected").length,
      exempt: items.filter((i) => i.status === "exempt").length,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const startItem = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredItems.length);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getFriendlyErrorMessage = (err: any, fallback: string): string => {
    const rawMsg = err?.response?.data?.message || err?.message;
    if (!rawMsg || typeof rawMsg !== "string") return fallback;
    if (
      rawMsg.toLowerCase().includes("route ") ||
      rawMsg.toLowerCase().includes("not found") ||
      rawMsg.toLowerCase().includes("cannot post") ||
      rawMsg.toLowerCase().includes("cannot get")
    ) {
      return "Service endpoint temporarily unreachable. Please try again in a moment.";
    }
    return rawMsg;
  };

  const handleApprove = async (item: JobsiteVerification) => {
    try {
      await actions.verify(item.id);
      toast.success(`${item.jobsiteId} approved`);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to approve verification. Please try again."));
    }
  };

  const handleConfirmReject = async (reason: string) => {
    try {
      await actions.reject({ id: rejectModalData.id, rejectReason: reason });
      toast.success(`${rejectModalData.jobsiteName} rejected`);
      setRejectModalData({ isOpen: false, id: "", jobsiteName: "" });
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to reject verification. Please try again."));
    }
  };

  const handleConfirmExempt = async (reason: string, note?: string) => {
    try {
      const finalReason = note ? `${reason} (Note: ${note})` : reason;

      if (exemptModalData.isBulk) {
        const selectedItems = filteredItems.filter((item) => selectedIds.includes(item.id));
        for (const it of selectedItems) {
          await actions.exempt({
            id: it.id,
            clientId: it.clientId,
            jobsiteId: it.jobsiteId,
            country: it.country,
            exemptReason: finalReason,
          });
        }
        toast.success("Selected verifications exempted");
        setSelectedIds([]);
      } else if (exemptModalData.id || exemptModalData.clientId) {
        await actions.exempt({
          id: exemptModalData.id,
          clientId: exemptModalData.clientId,
          jobsiteId: exemptModalData.jobsiteId,
          country: exemptModalData.country,
          exemptReason: finalReason,
        });
        toast.success(`Exempted ${exemptModalData.jobsiteId || "verification"}`);
      }
      setExemptModalData({ isOpen: false, isBulk: false });
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to update exemption. Please try again."));
    }
  };

  const handleRemoveExemption = async (item: JobsiteVerification) => {
    try {
      await actions.unexempt({
        id: item.id,
        clientId: item.clientId,
        jobsiteId: item.jobsiteId,
        country: item.country,
      });
      toast.success(`Exemption removed for ${item.jobsiteId}`);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Failed to remove exemption. Please try again."));
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusPill = (status: JobsiteVerificationStatus) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f9ee] px-3 py-1 text-[11px] font-semibold text-[#16a34a]">
            <CheckCircle2 size={12} /> Verified
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7e6] px-3 py-1 text-[11px] font-semibold text-[#b7791f]">
            <Clock size={12} /> Pending
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecec] px-3 py-1 text-[11px] font-semibold text-[#dc2626]">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "exempt":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6fe] px-3 py-1 text-[11px] font-semibold text-[#1e9ff2]">
            Exempt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f2f6] px-3 py-1 text-[11px] font-semibold text-[#8a8fa3]">
            Not started
          </span>
        );
    }
  };

  const getJobsiteMark = (jobsiteId: string) => {
    const isSeek = jobsiteId.toLowerCase().includes("seek");
    const isIndeed = jobsiteId.toLowerCase().includes("indeed");
    const mark = isSeek ? "SK" : isIndeed ? "IN" : jobsiteId.slice(0, 2).toUpperCase();
    const bg = isSeek ? "bg-[#e21b1b]" : isIndeed ? "bg-[#2557a7]" : "bg-[#14143c]";
    return { mark, bg };
  };

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Table Toolbar: Level 3 Filter Buttons (Blue active state with counts) & Search Box */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "All Verifications" },
              { key: "pending", label: "Pending" },
              { key: "verified", label: "Approved" },
              { key: "rejected", label: "Rejected" },
              { key: "exempt", label: "Exempted" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setStatusFilter(t.key);
                setPage(1);
              }}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === t.key
                  ? "border-[#1e9ff2] bg-[#1e9ff2] text-white shadow-sm"
                  : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c]"
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>

        <div className="flex w-64 items-center gap-2 rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 shadow-sm">
          <Search size={14} className="text-[#8a8fa3]" />
          <input
            type="text"
            placeholder="Search client or email"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full border-none bg-transparent text-xs text-[#14143c] outline-none placeholder:text-[#8a8fa3]"
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-[#14143c] px-4 py-2.5 text-xs font-semibold text-white">
          <span>{selectedIds.length} selected</span>
          <button
            onClick={() => setExemptModalData({ isOpen: true, isBulk: true })}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] hover:bg-gray-100"
          >
            Exempt selected
          </button>
        </div>
      )}

      {/* Submissions Table with # Column */}
      <div className="overflow-hidden rounded-2xl border border-[#ececf2] bg-white shadow-sm flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#ececf2] bg-[#fafbfd] text-[11px] font-bold uppercase tracking-wider text-[#8a8fa3]">
                <th className="w-10 px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={
                      filteredItems.length > 0 &&
                      selectedIds.length === filteredItems.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-[#ececf2]"
                  />
                </th>
                <th className="w-12 px-3 py-3 text-right text-[#8a8fa3] whitespace-nowrap">#</th>
                <th className="min-w-[170px] px-4 py-3 whitespace-nowrap">Client</th>
                <th className="min-w-[130px] px-4 py-3 whitespace-nowrap">Jobsite</th>
                <th className="min-w-[110px] px-4 py-3 whitespace-nowrap">Country</th>
                <th className="min-w-[120px] px-4 py-3 whitespace-nowrap">Submitted</th>
                <th className="min-w-[120px] px-4 py-3 whitespace-nowrap">Status</th>
                <th className="min-w-[280px] px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ececf2]">
              {paginatedItems.map((item, idx) => {
                const sn = (currentPage - 1) * pageSize + idx + 1;
                const clientName = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim() || "Client";
                const clientEmail = item.client?.email || "";
                const { mark, bg } = getJobsiteMark(item.jobsiteId);
                const isChecked = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-[#fafbfd]"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectRow(item.id)}
                        className="rounded border-[#ececf2]"
                      />
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium text-[#8a8fa3] whitespace-nowrap">
                      {sn}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-[#14143c]">
                        {clientName}
                      </div>
                      <div className="text-[11.5px] text-[#8a8fa3]">
                        {clientEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[9.5px] font-bold text-white ${bg}`}
                        >
                          {mark}
                        </div>
                        <span className="font-semibold text-[#14143c]">
                          {item.jobsiteId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#14143c] whitespace-nowrap">
                      {item.country}
                    </td>
                    <td className="px-4 py-3.5 text-[#8a8fa3] whitespace-nowrap">
                      {formatDate(item.submittedAt || (item.createdAt as any))}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderStatusPill(item.status)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setProofModalData({
                              isOpen: true,
                              jobsiteName: item.jobsiteId,
                              clientName,
                              proofFileRef: item.proofFileRef,
                            })
                          }
                          className="text-xs font-semibold text-[#1e9ff2] hover:underline mr-1 cursor-pointer transition"
                        >
                          View proof
                        </button>

                        {item.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApprove(item)}
                              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#16a34a] hover:border-[#16a34a] hover:bg-[#e6f9ee] transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setRejectModalData({
                                  isOpen: true,
                                  id: item.id,
                                  jobsiteName: item.jobsiteId,
                                })
                              }
                              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:border-[#dc2626] hover:bg-[#fdecec] transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              disabled
                              className="cursor-default rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] opacity-45"
                            >
                              Approve
                            </button>
                            <button
                              disabled
                              className="cursor-default rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] opacity-45"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded-lg border border-[#ececf2] bg-white p-1.5 text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c] transition shadow-sm"
                              title="More actions"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 bg-white border border-[#ececf2] rounded-lg shadow-lg p-1 z-[100]"
                          >
                            {item.status === "exempt" ? (
                              <DropdownMenuItem
                                onClick={() => handleRemoveExemption(item)}
                                className="cursor-pointer text-xs font-semibold text-[#1e9ff2] hover:bg-[#eaf6fe] focus:bg-[#eaf6fe] rounded-md px-3 py-2 transition"
                              >
                                Remove exemption
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  setExemptModalData({
                                    isOpen: true,
                                    isBulk: false,
                                    id: item.id,
                                    clientId: item.clientId,
                                    clientName,
                                    jobsiteId: item.jobsiteId,
                                    country: item.country,
                                  })
                                }
                                className="cursor-pointer text-xs font-semibold text-[#14143c] hover:bg-gray-50 focus:bg-gray-50 rounded-md px-3 py-2 transition"
                              >
                                Exempt client
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="py-12 text-center text-xs text-[#8a8fa3]">
            {items.length === 0
              ? "No verifications yet"
              : "No verifications match this filter and search combination."}
          </div>
        )}

        {/* Attached & Sticky Bottom Pagination */}
        <div className="sticky bottom-0 z-20 border-t border-[#ececf2] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8a8fa3] shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="whitespace-nowrap">
              Showing {startItem}-{endItem} of {filteredItems.length} verifications
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8a8fa3] whitespace-nowrap">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[72px] rounded-lg border border-[#ececf2] bg-white px-2.5 text-xs text-[#14143c] outline-none focus:border-[#1e9ff2]">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent className="w-[72px] min-w-[72px] bg-white border border-[#ececf2] rounded-lg shadow-lg z-[100]">
                  <SelectItem value="10" className="text-xs py-1.5 px-2">10</SelectItem>
                  <SelectItem value="20" className="text-xs py-1.5 px-2">20</SelectItem>
                  <SelectItem value="50" className="text-xs py-1.5 px-2">50</SelectItem>
                  <SelectItem value="100" className="text-xs py-1.5 px-2">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1 text-xs font-semibold text-[#14143c] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    currentPage === p
                      ? "bg-[#1e9ff2] text-white"
                      : "text-[#14143c] hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1 text-xs font-semibold text-[#14143c] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProofModal
        isOpen={proofModalData.isOpen}
        onClose={() => setProofModalData((prev) => ({ ...prev, isOpen: false }))}
        jobsiteName={proofModalData.jobsiteName}
        clientName={proofModalData.clientName}
        proofFileRef={proofModalData.proofFileRef}
      />

      <RejectModal
        isOpen={rejectModalData.isOpen}
        onClose={() => setRejectModalData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmReject}
        jobsiteName={rejectModalData.jobsiteName}
      />

      <ExemptModal
        isOpen={exemptModalData.isOpen}
        onClose={() => setExemptModalData((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmExempt}
        clientName={exemptModalData.clientName}
        isBulk={exemptModalData.isBulk}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}
