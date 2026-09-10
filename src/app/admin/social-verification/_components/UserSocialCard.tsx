"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORM_SLUGS,
  SocialVerificationRow,
  SocialVerificationUserSummary,
} from "@/hooks/api/social-verification.api";

type Props = {
  user: SocialVerificationUserSummary;
  isMutating: boolean;
  onApprove: (rowId: string) => Promise<void> | void;
  onReject: (rowId: string) => Promise<void> | void;
  onExempt: (user: SocialVerificationUserSummary) => Promise<void> | void;
};

const displayName = (user: SocialVerificationUserSummary) => {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.email ?? user.userId;
};

// Ensures every required platform has a slot in the UI — an unmapped row
// (rejected + not yet resubmitted) shows as "Not submitted" instead of
// silently disappearing.
const rowsByPlatform = (rows: SocialVerificationRow[]) => {
  const map = new Map<string, SocialVerificationRow>();
  for (const r of rows) map.set(r.platform, r);
  return SOCIAL_PLATFORM_SLUGS.map((p) => ({ platform: p, row: map.get(p) ?? null }));
};

export default function UserSocialCard({ user, isMutating, onApprove, onReject, onExempt }: Props) {
  const [expanded, setExpanded] = useState(user.pendingCount > 0);
  const platformRows = rowsByPlatform(user.rows);
  const badge = user.socialVerificationExempt
    ? { label: "Exempted", cls: "bg-blue-100 text-blue-800" }
    : user.pendingCount > 0
      ? { label: `${user.pendingCount} pending`, cls: "bg-amber-100 text-amber-800" }
      : user.capturedCount === user.requiredCount
        ? { label: "All approved", cls: "bg-emerald-100 text-emerald-800" }
        : { label: `${user.capturedCount}/${user.requiredCount} captured`, cls: "bg-gray-100 text-gray-700" };

  return (
    <div className="border border-gray-200 rounded-md">
      <div className="flex items-center justify-between p-3 gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{displayName(user)}</div>
            <div className="text-xs text-gray-500 truncate">
              {user.email ?? "—"} · {user.role ?? "unknown role"}
            </div>
          </div>
        </button>

        <span className={`text-xs px-2 py-1 rounded ${badge.cls}`}>{badge.label}</span>

        <Button
          size="sm"
          variant={user.socialVerificationExempt ? "outline" : "secondary"}
          disabled={isMutating}
          onClick={() => onExempt(user)}
        >
          {user.socialVerificationExempt ? "Remove exemption" : "Exempt user"}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {platformRows.map(({ platform, row }) => (
            <div key={platform} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-700">
                  {SOCIAL_PLATFORM_LABELS[platform]}
                </div>
                {row ? (
                  <div className="text-xs text-gray-500 truncate flex items-center gap-2">
                    <span className="truncate">@{row.username}</span>
                    {row.profileUrl && (
                      <a
                        href={row.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Not submitted</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {row?.verifiedAt ? (
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Approved
                  </span>
                ) : row ? (
                  <span className="text-xs text-amber-700 flex items-center gap-1">
                    <ShieldOff className="h-3 w-3" /> Pending
                  </span>
                ) : null}

                {row && !row.verifiedAt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isMutating}
                    onClick={() => onApprove(row.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                  </Button>
                )}
                {row && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isMutating}
                    onClick={() => onReject(row.id)}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
