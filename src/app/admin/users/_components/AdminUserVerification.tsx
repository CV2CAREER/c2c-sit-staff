"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Clock, XCircle, ShieldCheck, AlertCircle } from "lucide-react";
import { useClientJobsiteVerifications } from "@/hooks/api/jobsite-verification.api";
import { JobsiteVerification, JobsiteVerificationStatus } from "@/types/jobsite-verification.types";
import ProofModal from "@/app/admin/verifications/_components/ProofModal";
import RejectModal from "@/app/admin/verifications/_components/RejectModal";

export default function AdminUserVerification({ userId }: { userId: string }) {
  const { data, isLoading, isError, error, actions } = useClientJobsiteVerifications(userId);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#E5E9EF] bg-white p-5 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0F1E2E]">
            Jobsite Verification
          </h2>
          <p className="text-[12px] text-[#5B6B7C]">
            Review and attest this client's jobsite verification submisions
          </p>
        </div>
        <div className="flex items-center justify-center p-12 text-xs text-[#8a8fa3]">
          Loading verifications…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[#E5E9EF] bg-white p-5 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#0F1E2E]">
            Jobsite Verification
          </h2>
          <p className="text-[12px] text-[#5B6B7C]">
            Review and attest this client's jobsite verification submisions
          </p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-xs text-red-600">
          Failed to load verifications: {error?.message || "Unknown error"}
        </div>
      </div>
    );
  }

  const verifications = data?.verifications || [];
  const configs = data?.configs || [];
  const isExempt = data?.isExempt || false;
  const pendingCount = data?.pendingCount || 0;
  const verifiedCount = data?.verifiedCount || 0;
  const clientName = `${data?.client?.firstName || ""} ${data?.client?.lastName || ""}`.trim() || "Client";

  // Filter jobsites relevant to this client's country / configs
  const configuredJobsiteIds = new Set(configs.map((c) => c.jobsiteId.toLowerCase()));
  const relevantVerifications = verifications.filter(
    (v) => configuredJobsiteIds.has(v.jobsiteId.toLowerCase()) || v.status !== "not_started"
  );

  const handleApprove = async (item: JobsiteVerification) => {
    setBusyId(item.id);
    try {
      await actions.verify(item.id);
      toast.success(`${item.jobsiteId} approved`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve verification");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectModalData.id) return;
    setBusyId(rejectModalData.id);
    try {
      await actions.reject({ id: rejectModalData.id, rejectReason: reason });
      toast.success(`${rejectModalData.jobsiteName} rejected`);
      setRejectModalData({ isOpen: false, id: "", jobsiteName: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject verification");
    } finally {
      setBusyId(null);
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

  const getJobsiteMark = (jobsiteId: string) => {
    const isSeek = jobsiteId.toLowerCase().includes("seek");
    const isIndeed = jobsiteId.toLowerCase().includes("indeed");
    const mark = isSeek ? "SK" : isIndeed ? "IN" : jobsiteId.slice(0, 2).toUpperCase();
    const bg = isSeek ? "bg-[#e21b1b]" : isIndeed ? "bg-[#2557a7]" : "bg-[#14143c]";
    return { mark, bg };
  };

  const renderStatusPill = (status: JobsiteVerificationStatus) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f9ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#16a34a]">
            <CheckCircle2 size={11} /> Verified
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e6] px-2.5 py-0.5 text-[11px] font-semibold text-[#b7791f]">
            <Clock size={11} /> Pending
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecec] px-2.5 py-0.5 text-[11px] font-semibold text-[#dc2626]">
            <XCircle size={11} /> Rejected
          </span>
        );
      case "exempt":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf6fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#1e9ff2]">
            Exempt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f2f6] px-2.5 py-0.5 text-[11px] font-semibold text-[#8a8fa3]">
            Not started
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-[#E5E9EF] bg-white p-5 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      {/* Header & Subtext */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0F1E2E]">
            Jobsite Verification
          </h2>
          <p className="text-[12px] text-[#5B6B7C]">
            Review and attest this client's jobsite verification submisions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-[#8a8fa3]">
            Submissions summary:{" "}
            <span className="font-semibold text-[#b7791f]">
              {pendingCount} pending
            </span>
            {" · "}
            <span className="font-semibold text-[#16a34a]">
              {verifiedCount} verified
            </span>
          </div>

          {isExempt && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6fe] px-3 py-1 text-xs font-semibold text-[#1e9ff2]">
              <ShieldCheck size={14} /> Client is Exempt from Verification
            </div>
          )}
        </div>
      </div>

      {/* Clear Exemption Status Banner when exempt */}
      {isExempt && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#bce2fb] bg-[#f0f8fe] p-4 text-xs text-[#0e7490]">
          <AlertCircle size={18} className="shrink-0 text-[#1e9ff2]" />
          <div>
            <div className="font-bold text-[#14143c]">
              Verification Requirement Waived
            </div>
            <p className="mt-0.5 text-[#64748b]">
              This client has been granted exemption from jobsite verifications. No action is required.
            </p>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      {relevantVerifications.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[#ececf2]">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf2] bg-[#f8f9fa] text-[11.5px] font-semibold text-[#8a8fa3] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Jobsite</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ececf2] bg-white">
              {relevantVerifications.map((item) => {
                const { mark, bg } = getJobsiteMark(item.jobsiteId);
                const isItemBusy = busyId === item.id;
                const isPending = item.status === "pending";

                return (
                  <tr key={item.id} className="hover:bg-[#fafafc] transition">
                    {/* Jobsite */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${bg}`}
                        >
                          {mark}
                        </div>
                        <span className="font-semibold text-[#14143c]">
                          {item.jobsiteId}
                        </span>
                      </div>
                    </td>

                    {/* Proof */}
                    <td className="px-4 py-3">
                      {item.proofFileRef ? (
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
                          className="text-xs font-semibold text-[#1e9ff2] hover:underline cursor-pointer"
                        >
                          View proof
                        </button>
                      ) : (
                        <span className="text-xs text-[#8a8fa3]">No proof</span>
                      )}
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-3 text-xs text-[#8a8fa3]">
                      {formatDate(item.submittedAt || (item.createdAt as any))}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {renderStatusPill(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {isPending ? (
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isItemBusy || actions.isVerifying || actions.isRejecting}
                            onClick={() => handleApprove(item)}
                            className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#16a34a] hover:border-[#16a34a] hover:bg-[#e6f9ee] transition disabled:opacity-45 disabled:cursor-not-allowed shadow-sm"
                          >
                            {isItemBusy && actions.isVerifying ? "Approving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={isItemBusy || actions.isVerifying || actions.isRejecting}
                            onClick={() =>
                              setRejectModalData({
                                isOpen: true,
                                id: item.id,
                                jobsiteName: item.jobsiteId,
                              })
                            }
                            className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:border-[#dc2626] hover:bg-[#fdecec] transition disabled:opacity-45 disabled:cursor-not-allowed shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled
                            className="cursor-default rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] opacity-45"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled
                            className="cursor-default rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] opacity-45"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !isExempt ? (
        <div className="py-12 text-center">
          <p className="text-[13px] font-semibold text-[#0F1E2E]">
            No verification submissions yet
          </p>
          <p className="mt-1 text-[12px] text-[#95A3B2]">
            Verification submissions uploaded by the client will appear here for review.
          </p>
        </div>
      ) : null}

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
        isSubmitting={actions.isRejecting && busyId === rejectModalData.id}
      />
    </div>
  );
}
