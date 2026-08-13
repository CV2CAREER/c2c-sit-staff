"use client";
import { useReferralQueries, useReferralMutations } from "@/hooks/api/admin/referral";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FiLoader, FiRefreshCw, FiTrash2, FiAlertTriangle, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";

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
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
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
  return `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <FiX className="text-red-500 h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Decline Referral</h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{referrerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">
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
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Declining..." : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────
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
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="text-amber-500 h-5 w-5" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">Delete Referral</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <FiX className="h-5 w-5" />
        </button>
      </div>
      <div className="px-5 py-5">
        <p className="text-sm text-gray-600">
          Delete referral from{" "}
          <span className="font-semibold text-gray-900">{referrerName}</span>?
        </p>
        <p className="text-xs text-gray-400 mt-2">Soft delete — record stays but marked as deleted.</p>
      </div>
      <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Mobile Card ──────────────────────────────────────────────────────────────
const ReferralCard = ({
  row,
  activeTab,
  onApprove,
  onDecline,
  onMarkPaid,
  onDelete,
}: {
  row: any;
  activeTab: TabKey;
  onApprove: (id: string) => void;
  onDecline: (id: string, name: string) => void;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const s = (row.status || "").toUpperCase();
  const isRejected = s === "REJECTED";
  const isApproved = s === "APPROVED";
  const isPaid = isApproved || (row.paymentStatus || "").toLowerCase() === "paid";
  const rowName = row.referrerName || row.referrerEmail || row.sequentialId || "Unknown";

  const referredDisplay = row.referredName
    ? row.referredName.split(" ").slice(0, 2).map((n: string, i: number) =>
        i === 1 ? n.charAt(0) + "." : n
      ).join(" ")
    : row.referredEmail || "—";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Card Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-gray-800">
              {row.sequentialId || `${activeTab}-????`}
            </span>
            <StatusBadge status={row.status} />
            <PaymentBadge status={row.paymentStatus} tab={activeTab} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{formatDate(row.createdAt)}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 ml-2 mt-0.5 p-1 shrink-0"
        >
          {expanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* People */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2 border-t border-gray-50 pt-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">
            Referrer{activeTab === "GRP" ? " (Ambassador)" : ""}
          </p>
          <p className="text-sm text-blue-600 font-medium truncate">
            {row.referrerName || row.referrerEmail || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Referred</p>
          <p className="text-sm text-gray-700 truncate">{referredDisplay}</p>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-3 pt-2 border-t border-gray-50 grid grid-cols-2 gap-y-3 gap-x-2">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Role</p>
            <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-gray-100 text-gray-600">
              {row.role || "—"}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Reward</p>
            <p className="text-sm text-gray-600 font-medium">
              {activeTab === "GRP" && isPaid ? "+14 days" :
               activeTab === "CRP" && isPaid ? "$50" : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Updated By</p>
            <p className="text-xs text-gray-500">{row.updatedBy || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Deleted</p>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.isDeleted ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
              {row.isDeleted ? "Yes" : "No"}
            </span>
          </div>
          {row.declinedReason && (
            <div className="col-span-2">
              <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Decline Reason</p>
              <p className="text-xs text-gray-500">{row.declinedReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        {activeTab === "GRP" && (
          <>
            <button
              onClick={() => !isRejected && !isApproved && onDecline(row.referralId, rowName)}
              disabled={isRejected || isApproved}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                isRejected || isApproved
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-red-400 text-red-500 hover:bg-red-50"
              }`}
            >
              Decline
            </button>
            <button
              onClick={() => !isRejected && !isApproved && onApprove(row.referralId)}
              disabled={isRejected || isApproved}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-opacity ${
                isRejected || isApproved
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              Approve
            </button>
          </>
        )}
        {activeTab === "CRP" && (
          <button
            onClick={() => !isPaid && onMarkPaid(row.referralId)}
            disabled={isPaid}
            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
              isPaid
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-blue-400 text-blue-500 hover:bg-blue-50"
            }`}
          >
            {isPaid ? "Paid" : "Mark Paid"}
          </button>
        )}
        <button
          onClick={() => onDelete(row.referralId, rowName)}
          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-200"
          title="Delete"
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReferralComponent = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("GRP");
  const [users, setUsers] = useState<any[]>([]);
  const [paginationData, setPaginationData] = useState({ page: 0, pageSize: 50 });

  const [declineModal, setDeclineModal] = useState<{ id: string; name: string } | null>(null);
  const [declining, setDeclining] = useState(false);
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
    if (activeTab === "PRP") return u.isPartner === true;
    if (u.type) return u.type === activeTab;
    if (activeTab === "GRP") return u.isAmbassador === true;
    if (activeTab === "CRP") return !u.isPartner && (u.isAmbassador === false || u.isAmbassador === null);
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

  // CRP summary values
  const crpPaid = filteredReferrals.filter(
    (r) => (r.status || "").toUpperCase() === "APPROVED" || (r.paymentStatus || "").toLowerCase() === "paid"
  );
  const crpAwaiting = filteredReferrals.filter(
    (r) => (r.status || "").toUpperCase() !== "APPROVED" && (r.paymentStatus || "").toLowerCase() !== "paid" && (r.status || "").toUpperCase() !== "REJECTED"
  );

  return (
    <div className="flex flex-col bg-white rounded-xl p-4 sm:p-6 shadow-md">
      {/* Modals */}
      {declineModal && (
        <DeclineModal
          referrerName={declineModal.name}
          onConfirm={handleSubmitDecline}
          onClose={() => setDeclineModal(null)}
          loading={declining}
        />
      )}
      {deleteModal && (
        <DeleteModal
          referrerName={deleteModal.name}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteModal(null)}
          loading={deleting}
        />
      )}

      {/* Tabs + Refresh */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-left transition-colors flex-1 min-w-[90px] sm:flex-none sm:min-w-[110px] ${
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
        </div>
        <button
          onClick={() => referralsListDomain.refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors self-center"
          title="Refresh"
        >
          <FiRefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* CRP Payout Summary */}
      {activeTab === "CRP" && !isLoading && filteredReferrals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl bg-gradient-to-r from-[#0a1e3d] to-[#1a3a6e] text-white">
          <div>
            <p className="text-[11px] text-white/60 mb-0.5">Paid Payout</p>
            <p className="text-xl sm:text-2xl font-bold">${(crpPaid.length * 50).toLocaleString()}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{crpPaid.length} referral{crpPaid.length !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/60 mb-0.5">Pending Payout</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-300">${(crpAwaiting.length * 50).toLocaleString()}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{crpAwaiting.length} awaiting</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] text-white/60 mb-0.5">Total Referrals</p>
            <p className="text-xl sm:text-2xl font-bold">{filteredReferrals.length}</p>
            <p className="text-[11px] text-white/50 mt-0.5">$50 per approved</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <FiLoader className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No {activeTab} referrals found
        </div>
      ) : (
        <>
          {/* ── Mobile / Tablet: Card View (< lg) ── */}
          <div className="flex flex-col gap-3 lg:hidden">
            {filteredReferrals.map((row) => (
              <ReferralCard
                key={row.referralId}
                row={row}
                activeTab={activeTab}
                onApprove={handleApprove}
                onDecline={(id, name) => setDeclineModal({ id, name })}
                onMarkPaid={handleMarkPaid}
                onDelete={(id, name) => setDeleteModal({ id, name })}
              />
            ))}
          </div>

          {/* ── Desktop: Table View (≥ lg) ── */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-[1300px] w-full text-sm">
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
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Payment</th>
                  <th className="text-left py-3 px-4 font-semibold">Reason</th>
                  <th className="text-left py-3 px-4 font-semibold">Reward</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Updated By</th>
                  <th className="text-left py-3 px-4 font-semibold whitespace-nowrap">Deleted</th>
                  <th className="text-right py-3 px-4 font-semibold whitespace-nowrap min-w-[200px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReferrals.map((row) => {
                  const s = (row.status || "").toUpperCase();
                  const isRejected = s === "REJECTED";
                  const isApproved = s === "APPROVED";
                  const isPaid = isApproved || (row.paymentStatus || "").toLowerCase() === "paid";
                  const rowName = row.referrerName || row.referrerEmail || row.sequentialId || "Unknown";

                  return (
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
                      <td className="py-4 px-4 text-gray-400 text-xs max-w-[140px] truncate" title={row.declinedReason || ""}>
                        {row.declinedReason || "—"}
                      </td>
                      <td className="py-4 px-4 text-gray-500 text-xs font-medium">
                        {activeTab === "GRP" && isPaid ? "+14 days" :
                         activeTab === "CRP" && isPaid ? "$50" : "—"}
                      </td>
                      <td className="py-4 px-4 text-gray-500 text-xs">{row.updatedBy || "—"}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${row.isDeleted ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
                          {row.isDeleted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap min-w-[200px]">
                        <div className="flex gap-2 justify-end items-center">
                          {activeTab === "GRP" && (
                            <>
                              <button
                                onClick={() => !isRejected && !isApproved && setDeclineModal({ id: row.referralId, name: rowName })}
                                disabled={isRejected || isApproved}
                                className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
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
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-opacity ${
                                  isRejected || isApproved
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-500 text-white hover:bg-blue-600"
                                }`}
                              >
                                Approve
                              </button>
                            </>
                          )}
                          {activeTab === "CRP" && (
                            <button
                              onClick={() => !isPaid && handleMarkPaid(row.referralId)}
                              disabled={isPaid}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                                isPaid
                                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                                  : "border-blue-400 text-blue-500 hover:bg-blue-50"
                              }`}
                            >
                              {isPaid ? "Paid" : "Mark Paid"}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteModal({ id: row.referralId, name: rowName })}
                            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {filteredReferrals.length >= paginationData.pageSize && (
            <div className="flex justify-center pt-6">
              <button
                onClick={() => setPaginationData((p) => ({ ...p, page: p.page + 1 }))}
                className="text-sm text-blue-600 hover:underline"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReferralComponent;
