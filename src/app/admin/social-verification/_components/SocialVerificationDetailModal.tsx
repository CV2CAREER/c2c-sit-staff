"use client";

import React from "react";
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORM_SLUGS,
  SocialVerificationRow,
  SocialVerificationUserSummary,
} from "@/hooks/api/social-verification.api";

interface SocialVerificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SocialVerificationUserSummary | null;
  isMutating: boolean;
  onApprove: (rowId: string) => Promise<void> | void;
  onReject: (rowId: string) => Promise<void> | void;
  onExempt: (user: SocialVerificationUserSummary) => Promise<void> | void;
}

export default function SocialVerificationDetailModal({
  isOpen,
  onClose,
  user,
  isMutating,
  onApprove,
  onReject,
  onExempt,
}: SocialVerificationDetailModalProps) {
  if (!isOpen || !user) return null;

  const clientName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Client";

  const rowsMap = new Map<string, SocialVerificationRow>();
  for (const r of user.rows || []) {
    rowsMap.set(r.platform, r);
  }

  const platformRows = SOCIAL_PLATFORM_SLUGS.map((p) => ({
    platform: p,
    row: rowsMap.get(p) ?? null,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14143c]/40 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-[#14143c]">
              Social Verification Details
            </h3>
            <p className="mt-0.5 text-xs text-[#8a8fa3]">
              Review social profiles and handles submitted by {clientName}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#8a8fa3] hover:bg-gray-100 hover:text-[#14143c]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* KV block matching SPR-22-05 style */}
        <div className="mt-4 rounded-xl bg-[#f5f8fa] p-3.5 text-xs space-y-1.5 border border-[#e4eaf0]">
          <div className="flex items-center justify-between">
            <span className="text-[#8a8fa3]">Client Name</span>
            <span className="font-semibold text-[#14143c]">{clientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8a8fa3]">Email Address</span>
            <span className="font-medium text-[#14143c]">{user.email || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8a8fa3]">Progress</span>
            <span className="font-semibold text-[#1e9ff2]">
              {user.capturedCount}/{user.requiredCount} captured · {user.approvedCount} approved
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8a8fa3]">Exemption Status</span>
            <span className="font-medium">
              {user.socialVerificationExempt ? (
                <span className="text-[#1e9ff2]">Exempted</span>
              ) : (
                <span className="text-[#8a8fa3]">Standard (Not exempt)</span>
              )}
            </span>
          </div>
        </div>

        {/* Platform Candidate List matching clist in SPR-22-05 */}
        <div className="mt-4 rounded-xl border border-[#ececf2] divide-y divide-[#ececf2] overflow-hidden bg-white">
          <div className="bg-[#fafbfd] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#8a8fa3]">
            Candidate Platforms ({platformRows.length})
          </div>
          {platformRows.map(({ platform, row }) => {
            const isApproved = !!row?.verifiedAt;
            const isPending = !!row && !row.verifiedAt;
            const notSubmitted = !row;

            return (
              <div
                key={platform}
                className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[#fafbfd]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#14143c]">
                      {SOCIAL_PLATFORM_LABELS[platform]}
                    </span>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f9ee] px-2 py-0.5 text-[10.5px] font-semibold text-[#16a34a]">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff7e6] px-2 py-0.5 text-[10.5px] font-semibold text-[#b7791f]">
                        <Clock size={11} /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f2f6] px-2 py-0.5 text-[10.5px] font-semibold text-[#8a8fa3]">
                        Not submitted
                      </span>
                    )}
                  </div>

                  {row ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#8a8fa3]">
                      <span className="font-mono text-[#14143c]">@{row.username}</span>
                      {row.profileUrl && (
                        <a
                          href={row.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[#1e9ff2] hover:underline"
                        >
                          View profile <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[11px] text-[#8a8fa3]">
                      Client has not entered a handle for this platform.
                    </div>
                  )}
                </div>

                {/* Actions per platform */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {row && !isApproved && (
                    <button
                      onClick={() => onApprove(row.id)}
                      disabled={isMutating}
                      className="rounded-lg border border-[#ececf2] bg-white px-2.5 py-1 text-xs font-semibold text-[#16a34a] hover:border-[#16a34a] hover:bg-[#e6f9ee] disabled:opacity-40"
                    >
                      Approve
                    </button>
                  )}
                  {row && (
                    <button
                      onClick={() => onReject(row.id)}
                      disabled={isMutating}
                      className="rounded-lg border border-[#ececf2] bg-white px-2.5 py-1 text-xs font-semibold text-[#dc2626] hover:border-[#dc2626] hover:bg-[#fdecec] disabled:opacity-40"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#ececf2] pt-4">
          <button
            type="button"
            onClick={() => onExempt(user)}
            disabled={isMutating}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
              user.socialVerificationExempt
                ? "border-[#1e9ff2] bg-[#eaf6fe] text-[#1e9ff2] hover:bg-[#d8effc]"
                : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c]"
            }`}
          >
            {user.socialVerificationExempt ? "Remove Exemption" : "Exempt User"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#1e9ff2] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#1a8ddb] transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
