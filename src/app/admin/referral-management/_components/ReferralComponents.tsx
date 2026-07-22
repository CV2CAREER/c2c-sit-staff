"use client";
import { useReferralQueries, useReferralMutations } from "@/hooks/api/admin/referral";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiLoader, FiRefreshCw, FiTrash2, FiAlertTriangle, FiX } from "react-icons/fi";

type TabKey = "GRP" | "CRP" | "PRP";

const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: "GRP", label: "GRP", sub: "Guest Referral" },
  { key: "CRP", label: "CRP", sub: "Client Referral" },
  { key: "PRP", label: "PRP", sub: "Partner Referral" },
];

const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || "").toUpperCase();
  const cls =
    s === "APPROVED" ? "bg-green-100 text-green-700" :
    s === "CLAIMED"  ? "bg-blue-100 text-blue-700" :
    s === "PENDING"  ? "bg-amber-100 text-amber-700" :
    s === "REJECTED" ? "bg-red-100 text-red-600" :
    "bg-gray-100 text-gray-600";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {s || "PENDING"}
    </span>
  );
};

const PaymentBadge = ({ status, tab }: { status: string; tab: string }) => {
  const s = (status || "").toLowerCase();
  const isGrp = tab === "GRP";
  const cls =
    s === "paid"    ? "bg-green-100 text-green-700" :
    s === "pending" ? "bg-amber-100 text-amber-700" :
    "bg-gray-100 text-gray-500";
  const label = isGrp
    ? (s === "paid" ? "Rewarded" : "Not Rewarded")
    : (s === "paid" ? "Paid" : s === "pending" ? "Pending" : "Unpaid");
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const formatDate = (date: string) => {
  if (!date) return "—";
  const d = new Date(date);
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
};

// ─── Decline Modal ────────────────────────────────────────────────────────────
const DeclineModal = ({
  referrerName,
  onConfirm,
  onClose,
  loading,
}: {
  referrerName: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
              <FiX className="text-red-500 h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Decline Referral</h3>
              <p className="text-xs text-gray-400 mt-0.5">{referrerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for declining <span className="text-red-500">*</span>
          </label>
          <textarea
            autoFocus
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none transition"
            placeholder="Explain why this referral is being declined..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1.5">This reason will be saved and visible in the table.</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#ef4444" }}
          >
            {loading ? "Declining..." : "Decline Referral"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteModal = ({
  referrerName,
  onConfirm,
  onClose,
  loading,
}: {
  referrerName: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
            <FiAlertTriangle className="text-amber-500 h-5 w-5" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">Delete Referral</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete the referral from{" "}
          <span className="font-semibold text-gray-900">{referrerName}</span>?
        </p>
        <p className="text-xs text-gray-400 mt-2">
          This is a soft delete — the record stays in the database but will be marked as deleted.
        </p>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#ef4444" }}
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ReferralComponent = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("GRP");
  const [users, setUsers] = useState<any[]>([]);
  const [paginationData, setPaginationData] = useState({ page: 0, pageSize: 50 });

  // Decline modal state
  const [declineModal, setDeclineModal] = useState<{ id: string; name: string } | null>(null);
  const [declining, setDeclining] = useState(false);

  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { referralsListDomain } = useReferralQueries({
    fetchReferrals: true,
    variance: "all",
    page: paginationData.page + 1,
    pageSize: paginationData.pageSize,
  });

  const { approveClaim, declineClaim, updatePaymentStatus, deleteReferral } = useReferralMutations();

  useEffect(() => {
    if (referralsListDomain.data) {
      const responseData = referralsListDomain.data as any;
      const usersArray = responseData?.users || responseData || [];
      setUsers(Array.isArray(usersArray) ? usersArray : []);
    } else if (referralsListDomain.isError) {
      setUsers([]);
      toast.error("Failed to load referrals.");
    }
  }, [referralsListDomain.data, referralsListDomain.isError]);

  const filteredReferrals = users.filter((u) => {
    if (u.type) return u.type === activeTab;
    if (activeTab === "GRP") return u.isAmbassador === true;
    if (activeTab === "CRP") return u.isAmbassador === false || u.isAmbassador === null;
    return false;
  });

  const handleApprove = async (id: string) => {
    const t = toast.loading("Approving...");
    try {
      await approveClaim.mutateAsync(id);
      toast.success("Referral approved", { id: t });
      referralsListDomain.refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Something went wrong", { id: t });
    }
  };

  const handleSubmitDecline = async (reason: string) => {
    if (!declineModal) return;
    setDeclining(true);
    const t = toast.loading("Declining...");
    try {
      await declineClaim.mutateAsync({ id: declineModal.id, reason });
      toast.success("Referral declined", { id: t });
      setDeclineModal(null);
      referralsListDomain.refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Something went wrong", { id: t });
    } finally {
      setDeclining(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const t = toast.loading("Updating...");
    try {
      await updatePaymentStatus.mutateAsync({ id, paymentStatus: "paid" });
      toast.success("Marked as paid", { id: t });
      referralsListDomain.refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Something went wrong", { id: t });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    const t = toast.loading("Deleting...");
    try {
      await deleteReferral.mutateAsync({ id: deleteModal.id });
      toast.success("Referral deleted", { id: t });
      setDeleteModal(null);
      referralsListDomain.refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Something went wrong", { id: t });
    } finally {
      setDeleting(false);
    }
  };

  const isLoading = referralsListDomain.isLoading || referralsListDomain.isFetching;

  return (
    <div className="flex flex-col bg-white rounded-sm p-4 sm:p-6 shadow-md">
      {/* Decline Modal */}
      {declineModal && (
        <DeclineModal
          referrerName={declineModal.name}
          onConfirm={handleSubmitDecline}
          onClose={() => setDeclineModal(null)}
          loading={declining}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteModal
          referrerName={deleteModal.name}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteModal(null)}
          loading={deleting}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 rounded-xl text-left transition-colors min-w-[110px] ${
              activeTab === tab.key
                ? "bg-[#1a2744] text-white"
                : "bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100"
            }`}
          >
            <div className="font-bold text-sm">{tab.label}</div>
            <div className={`text-xs mt-0.5 ${activeTab === tab.key ? "text-blue-300" : "text-gray-400"}`}>
              {tab.sub}
            </div>
          </button>
        ))}

        <button
          onClick={() => referralsListDomain.refetch()}
          className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors self-center"
          title="Refresh"
        >
          <FiRefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* CRP Total Payout Summary */}
      {activeTab === "CRP" && !isLoading && filteredReferrals.length > 0 && (() => {
        const paid = filteredReferrals.filter(
          (r) => (r.status || "").toUpperCase() === "APPROVED" || (r.paymentStatus || "").toLowerCase() === "paid"
        );
        const awaiting = filteredReferrals.filter(
          (r) => (r.status || "").toUpperCase() !== "APPROVED" && (r.paymentStatus || "").toLowerCase() !== "paid" && (r.status || "").toUpperCase() !== "REJECTED"
        );
        const totalPayout = paid.length * 50;
        const pendingPayout = awaiting.length * 50;
        return (
          <div className="flex flex-wrap gap-4 mb-5 p-4 rounded-xl bg-gradient-to-r from-[#0a1e3d] to-[#1a3a6e] text-white">
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-white/60 mb-0.5">Total Payout (Paid)</p>
              <p className="text-2xl font-bold">${totalPayout.toLocaleString()}</p>
              <p className="text-xs text-white/50 mt-0.5">{paid.length} referral{paid.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-white/60 mb-0.5">Pending Payout</p>
              <p className="text-2xl font-bold text-amber-300">${pendingPayout.toLocaleString()}</p>
              <p className="text-xs text-white/50 mt-0.5">{awaiting.length} awaiting</p>
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-white/60 mb-0.5">Total CRP Referrals</p>
              <p className="text-2xl font-bold">{filteredReferrals.length}</p>
              <p className="text-xs text-white/50 mt-0.5">$50 per approved</p>
            </div>
          </div>
        );
      })()}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <FiLoader className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Referral ID</th>
                <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">
                  Referrer{activeTab === "GRP" ? " (Ambassador)" : ""}
                </th>
                <th className="text-left py-3 px-4 font-semibold">Referred</th>
                <th className="text-left py-3 px-4 font-semibold">Role</th>
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Payment Status</th>
                <th className="text-left py-3 px-4 font-semibold">Reason</th>
                <th className="text-left py-3 px-4 font-semibold">Reward</th>
                <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Last Updated By</th>
                <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Is Deleted</th>
                <th className="text-right py-3 px-4 font-semibold whitespace-nowrap min-w-[220px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-20 text-gray-400 text-sm">
                    No {activeTab} referrals found
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((row) => (
                  <tr key={row.referralId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-sm font-mono">
                      {row.sequentialId || `${activeTab}-????`}
                    </td>
                    <td className="py-4 px-4 text-blue-600 font-medium">
                      {row.referrerName || row.referrerEmail || "—"}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {row.referredName
                        ? row.referredName.split(" ").slice(0, 2).map((n: string, i: number) =>
                            i === 1 ? n.charAt(0) + "." : n
                          ).join(" ")
                        : row.referredEmail || "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium capitalize bg-gray-100 text-gray-600">
                        {row.role || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-blue-500 whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-4 px-4">
                      <PaymentBadge status={row.paymentStatus} tab={activeTab} />
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-xs max-w-[160px] truncate" title={row.declinedReason || ""}>
                      {row.declinedReason || "—"}
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-xs font-medium">
                      {(() => {
                        const isPaid = (row.status || "").toUpperCase() === "APPROVED" || (row.paymentStatus || "").toLowerCase() === "paid";
                        if (activeTab === "GRP" && isPaid) return "+14 days";
                        if (activeTab === "CRP" && isPaid) return "$50";
                        return "—";
                      })()}
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-xs">
                      {row.updatedBy || "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${row.isDeleted ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
                        {row.isDeleted ? "true" : "false"}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap min-w-[220px]">
                      <div className="flex gap-2 justify-end items-center">
                        {activeTab === "GRP" && (() => {
                          const s = (row.status || "").toUpperCase();
                          const isRejected = s === "REJECTED";
                          const isApproved = s === "APPROVED";
                          const rowName = row.referrerName || row.referrerEmail || row.sequentialId || "Unknown";
                          return (
                            <>
                              <button
                                onClick={() => !isRejected && !isApproved && setDeclineModal({ id: row.referralId, name: rowName })}
                                disabled={isRejected || isApproved}
                                className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                                  isRejected || isApproved
                                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                    : "border-red-400 text-red-500 hover:bg-red-50"
                                }`}
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => !isRejected && !isApproved && handleApprove(row.referralId)}
                                disabled={isRejected || isApproved}
                                className="px-4 py-1.5 rounded-full text-xs font-medium transition-opacity"
                                style={{
                                  backgroundColor: isRejected || isApproved ? "#e5e7eb" : "#3b82f6",
                                  color: isRejected || isApproved ? "#9ca3af" : "#ffffff",
                                  cursor: isRejected || isApproved ? "not-allowed" : "pointer",
                                }}
                              >
                                Approve
                              </button>
                            </>
                          );
                        })()}
                        {activeTab === "CRP" && (() => {
                          const isPaid = (row.status || "").toUpperCase() === "APPROVED" || (row.paymentStatus || "").toLowerCase() === "paid";
                          return (
                            <button
                              onClick={() => !isPaid && handleMarkPaid(row.referralId)}
                              disabled={isPaid}
                              className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                                isPaid
                                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                  : "border-blue-400 text-blue-500 hover:bg-blue-50"
                              }`}
                            >
                              {isPaid ? "Paid" : "Mark Paid"}
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => setDeleteModal({ id: row.referralId, name: row.referrerName || row.referrerEmail || row.sequentialId || "Unknown" })}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete referral"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {filteredReferrals.length > 0 && filteredReferrals.length >= paginationData.pageSize && (
            <div className="flex justify-center pt-6">
              <button
                onClick={() => setPaginationData((p) => ({ ...p, page: p.page + 1 }))}
                className="text-sm text-blue-600 hover:underline"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferralComponent;
