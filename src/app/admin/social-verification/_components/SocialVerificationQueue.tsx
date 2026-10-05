"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  QueueStatus,
  SocialVerificationUserSummary,
  useSocialVerificationQueue,
} from "@/hooks/api/social-verification.api";
import SocialVerificationDetailModal from "./SocialVerificationDetailModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_TABS: { value: QueueStatus; label: string }[] = [
  { value: "all", label: "All Users" },
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Fully Approved" },
];

export default function SocialVerificationQueue() {
  const [status, setStatus] = useState<QueueStatus>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [detailUser, setDetailUser] = useState<SocialVerificationUserSummary | null>(null);

  const { listDomain, actions } = useSocialVerificationQueue({
    q,
    status,
    page,
    limit: 50,
  });

  const items = listDomain.items;

  const totals = useMemo(() => {
    const pending = items.reduce((s, u) => s + u.pendingCount, 0);
    const approved = items.reduce((s, u) => s + u.approvedCount, 0);
    const exempted = items.filter((u) => u.socialVerificationExempt).length;
    return { pending, approved, exempted };
  }, [items]);

  const counts = useMemo(() => {
    return {
      all: listDomain.total || items.length,
      pending: items.filter((u) => u.pendingCount > 0).length,
      approved: items.filter((u) => u.capturedCount === u.requiredCount && u.pendingCount === 0).length,
    };
  }, [items, listDomain.total]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
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

  const handleApprove = async (rowId: string) => {
    try {
      await actions.approveRow(rowId);
      toast.success("Social handle approved");
      if (detailUser) {
        setDetailUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            rows: prev.rows.map((r) =>
              r.id === rowId ? { ...r, verifiedAt: new Date().toISOString() } : r
            ),
            approvedCount: prev.approvedCount + 1,
            pendingCount: Math.max(0, prev.pendingCount - 1),
          };
        });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Could not approve handle. Please try again."));
    }
  };

  const handleReject = async (rowId: string) => {
    try {
      await actions.rejectRow(rowId);
      toast.success("Social handle rejected — user must resubmit");
      if (detailUser) {
        setDetailUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            rows: prev.rows.filter((r) => r.id !== rowId),
            capturedCount: Math.max(0, prev.capturedCount - 1),
            pendingCount: Math.max(0, prev.pendingCount - 1),
          };
        });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Could not reject handle. Please try again."));
    }
  };

  const handleApproveAllPendingForUser = async (user: SocialVerificationUserSummary) => {
    const pendingRows = user.rows.filter((r) => !r.verifiedAt);
    if (!pendingRows.length) return;

    try {
      for (const row of pendingRows) {
        await actions.approveRow(row.id);
      }
      toast.success(`Approved all pending handles for ${user.firstName || "client"}`);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Could not approve all handles. Please try again."));
    }
  };

  const handleExempt = async (user: SocialVerificationUserSummary) => {
    try {
      if (user.socialVerificationExempt) {
        await actions.unExemptUser(user.userId);
        toast.success("Exemption removed — user must submit all 7 handles");
      } else {
        await actions.exemptUser(user.userId);
        toast.success("User exempted — Jobsite Credentials unlocked");
      }
      if (detailUser && detailUser.userId === user.userId) {
        setDetailUser((prev) =>
          prev ? { ...prev, socialVerificationExempt: !prev.socialVerificationExempt } : null
        );
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, "Could not update exemption. Please try again."));
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const startItem = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, items.length);

  const renderUserStatusPill = (user: SocialVerificationUserSummary) => {
    if (user.socialVerificationExempt) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf6fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#1e9ff2] whitespace-nowrap">
          <ShieldCheck size={11} /> Exempted
        </span>
      );
    }
    if (user.pendingCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e6] px-2.5 py-0.5 text-[11px] font-semibold text-[#b7791f] whitespace-nowrap">
          <Clock size={11} /> {user.pendingCount} Pending
        </span>
      );
    }
    if (user.capturedCount === user.requiredCount && user.requiredCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f9ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#16a34a] whitespace-nowrap">
          <CheckCircle2 size={11} /> All Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f2f6] px-2.5 py-0.5 text-[11px] font-semibold text-[#8a8fa3] whitespace-nowrap">
        {user.capturedCount}/{user.requiredCount} Captured
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Level 3 Filter Tabs Toolbar (Blue active state with counts) & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                status === t.value
                  ? "border-[#1e9ff2] bg-[#1e9ff2] text-white shadow-sm"
                  : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c]"
              }`}
            >
              {t.label} ({counts[t.value]})
            </button>
          ))}
        </div>

        <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
          <div className="flex w-60 items-center gap-2 rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 shadow-sm">
            <Search size={14} className="text-[#8a8fa3]" />
            <input
              type="text"
              placeholder="Search name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border-none bg-transparent text-xs text-[#14143c] outline-none placeholder:text-[#8a8fa3]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#1e9ff2] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1a8ddb] transition whitespace-nowrap"
          >
            Search
          </button>
        </form>
      </div>

      {/* Responsive Summary Chips */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700 flex items-center gap-1 border border-amber-100 whitespace-nowrap">
          <ShieldOff className="h-3.5 w-3.5" /> {totals.pending} pending handle(s)
        </span>
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 flex items-center gap-1 border border-emerald-100 whitespace-nowrap">
          <ShieldCheck className="h-3.5 w-3.5" /> {totals.approved} approved handle(s)
        </span>
        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 border border-blue-100 whitespace-nowrap">
          {totals.exempted} exempted user(s)
        </span>
        <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-gray-600 border border-gray-100 font-medium whitespace-nowrap sm:ml-auto">
          {listDomain.total} total user(s)
        </span>
      </div>

      {/* Regular Table with # Column & Mobile Horizontal Scroll */}
      <div className="overflow-hidden rounded-2xl border border-[#ececf2] bg-white shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#ececf2] bg-[#fafbfd] text-[11px] font-bold uppercase tracking-wider text-[#8a8fa3]">
                <th className="w-12 px-3 py-3 text-right text-[#8a8fa3]">#</th>
                <th className="min-w-[170px] px-4 py-3">Client</th>
                <th className="min-w-[90px] px-4 py-3">Role</th>
                <th className="min-w-[150px] px-4 py-3">Handles</th>
                <th className="min-w-[120px] px-4 py-3">Status</th>
                <th className="min-w-[240px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ececf2]">
              {listDomain.isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8a8fa3]">
                    Loading social verification queue…
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8a8fa3]">
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((user, idx) => {
                  const sn = (currentPage - 1) * pageSize + idx + 1;
                  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Client";
                  const isMutating = actions.isApproving || actions.isRejecting || actions.isExempting;

                  return (
                    <tr key={user.userId} className="transition-colors hover:bg-[#fafbfd]">
                      <td className="px-3 py-3.5 text-right font-medium text-[#8a8fa3]">
                        {sn}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#14143c]">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-[#8a8fa3]">
                          {user.email || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#14143c]">
                        {user.role || "Client"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-[#14143c] whitespace-nowrap">
                          {user.capturedCount}/{user.requiredCount} handles
                        </span>
                        {user.pendingCount > 0 && (
                          <span className="ml-1 text-[11px] text-[#b7791f] whitespace-nowrap">
                            ({user.pendingCount} pending)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {renderUserStatusPill(user)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {user.pendingCount > 0 ? (
                            <button
                              onClick={() => handleApproveAllPendingForUser(user)}
                              disabled={isMutating}
                              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#16a34a] hover:border-[#16a34a] hover:bg-[#e6f9ee]"
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              disabled
                              className="cursor-default rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] opacity-45"
                            >
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const firstPending = user.rows.find((r) => !r.verifiedAt);
                              if (firstPending) {
                                handleReject(firstPending.id);
                              } else if (user.rows[0]) {
                                handleReject(user.rows[0].id);
                              }
                            }}
                            disabled={isMutating || user.rows.length === 0}
                            className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:border-[#dc2626] hover:bg-[#fdecec] disabled:opacity-45"
                          >
                            Reject
                          </button>

                          {/* Full text Exempt button placed BEFORE the view button */}
                          <button
                            onClick={() => handleExempt(user)}
                            disabled={isMutating}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                              user.socialVerificationExempt
                                ? "border-[#1e9ff2] bg-[#eaf6fe] text-[#1e9ff2] hover:bg-[#d8effc]"
                                : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c]"
                            }`}
                          >
                            {user.socialVerificationExempt ? "Remove Exemption" : "Exempt"}
                          </button>

                          {/* Eye icon button placed AFTER the Exempt button */}
                          <button
                            onClick={() => setDetailUser(user)}
                            className="rounded-lg border border-[#ececf2] bg-white p-1.5 text-[#8a8fa3] hover:border-[#1e9ff2] hover:text-[#1e9ff2] shadow-sm transition"
                            title="View social verification details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Attached & Sticky Bottom of Table Pager */}
        <div className="sticky bottom-0 z-20 border-t border-[#ececf2] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8a8fa3] shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="whitespace-nowrap">
              Showing {startItem}-{endItem} of {items.length} users
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

      {/* Social Verification Details Modal */}
      <SocialVerificationDetailModal
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        user={detailUser}
        isMutating={actions.isApproving || actions.isRejecting || actions.isExempting}
        onApprove={handleApprove}
        onReject={handleReject}
        onExempt={handleExempt}
      />
    </div>
  );
}
