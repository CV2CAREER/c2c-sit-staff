"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAdminMutations } from "@/hooks/api/admin.api";
import {
  useAddClientCommentMutation,
  useAssignmentDetailQuery,
  useClientCommentsQuery,
} from "@/hooks/api/admin/placement-assignments";
import { AssignmentRoleKey } from "@/hooks/api/admin/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, X } from "lucide-react";

const ROLE_LABELS: Record<AssignmentRoleKey, string> = {
  dpc: "DPC",
  vpc: "VPC",
  spc: "SPC",
  interimdpc: "Interim DPC",
  interimspc: "Interim SPC",
};
const ROLE_VARIANT: Record<AssignmentRoleKey, "DPC" | "VPC" | "SPC" | "InterimDPC" | "InterimSPC"> = {
  dpc: "DPC",
  vpc: "VPC",
  spc: "SPC",
  interimdpc: "InterimDPC",
  interimspc: "InterimSPC",
};
const ROLE_KEYS: AssignmentRoleKey[] = ["dpc", "vpc", "spc", "interimdpc", "interimspc"];
const OVERLOAD = 15;
// Radix Select.Item rejects an empty-string value, so "unassign" needs a
// real sentinel that gets translated back to "" before it hits the API.
const UNASSIGNED = "__unassigned__";

const daysLabel = (days: number | null) => (days === null ? "—" : days < 0 ? `${Math.abs(days)} over` : String(days));
const daysColor = (days: number | null) => (days === null || days < 0 ? "#C23434" : days <= 14 ? "#B4530A" : "#12202D");

interface ClientAssignmentDrawerProps {
  credId: string | null;
  onClose: () => void;
  // Called after an assignment or flight-status change is saved, so the
  // page that opened the drawer (Assignments list, Exceptions list, ...)
  // can refresh its own data — the drawer only knows to refresh itself.
  onChanged?: () => void;
}

/**
 * Single, reusable slide-over panel for viewing/editing one client's
 * DPC/VPC/SPC assignment, campaign status and comments — matches the
 * reference console's pattern of one shared drawer opened from every page
 * (Assignments, Exceptions, ...), not a page-specific drawer.
 */
export default function ClientAssignmentDrawer({ credId, onClose, onChanged }: ClientAssignmentDrawerProps) {
  const { assignVaMutation, toggleFlightStatusMutation } = useAdminMutations();
  const queryClient = useQueryClient();

  const { detail, isLoading } = useAssignmentDetailQuery(credId);
  const { comments, isLoading: commentsLoading } = useClientCommentsQuery(credId);
  const addCommentMutation = useAddClientCommentMutation();

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [flightPending, setFlightPending] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  // Reset the draft whenever a different client's drawer opens.
  useEffect(() => {
    setCommentDraft("");
  }, [credId]);

  if (!credId) return null;

  const row = detail?.row ?? null;
  const controllers = detail?.controllers ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-placement-assignment-detail", credId] });
    onChanged?.();
  };

  const assignOne = (role: AssignmentRoleKey, controllerEmail: string) => {
    setPendingKey(role);
    assignVaMutation.mutate(
      { credId, vaEmail: controllerEmail || "Unassigned", variant: ROLE_VARIANT[role] },
      {
        onSuccess: () => {
          toast.success(`${ROLE_LABELS[role]} updated`);
          invalidate();
        },
        onError: () => toast.error(`Failed to update ${ROLE_LABELS[role]}`),
        onSettled: () => setPendingKey(null),
      },
    );
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-20 bg-[#12202D]/30" />
      <aside className="fixed inset-y-0 right-0 z-30 flex w-[420px] max-w-[94vw] flex-col bg-white shadow-[-20px_0_54px_rgba(20,40,70,0.18)]">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{row?.name || "Loading…"}</h2>
            {row && (
              <p className="mt-1.5 text-xs text-gray-500">
                {row.industry || "No industry on file"} · Sub end {row.subEnd || "—"} ·{" "}
                <span style={{ color: daysColor(row.days) }}>{daysLabel(row.days)} days</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading || !row ? (
            <p className="text-xs text-gray-400">Loading client…</p>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Campaign status</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{row.capitalized || "Unknown"}</p>
                </div>
                <button
                  type="button"
                  disabled={flightPending}
                  onClick={() => {
                    setFlightPending(true);
                    toggleFlightStatusMutation.mutate(
                      { clientId: row.credId },
                      {
                        onSuccess: () => {
                          toast.success(row.capitalized === "INFLIGHT" ? "Campaign landed" : "Campaign launched");
                          invalidate();
                        },
                        onError: () => toast.error("Failed to toggle flight status"),
                        onSettled: () => setFlightPending(false),
                      },
                    );
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                    row.capitalized === "INFLIGHT" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {flightPending && <Loader2 size={13} className="animate-spin" />}
                  {row.capitalized === "INFLIGHT" ? "Land" : "Launch"}
                </button>
              </div>

              <p className="mb-4 text-[11px] uppercase tracking-wide text-gray-400">Assignment</p>
              <div className="flex flex-col gap-4">
                {ROLE_KEYS.map((role) => {
                  const value = row[role];
                  const pending = pendingKey === role;
                  const overloaded = !!value.name && value.load > OVERLOAD;
                  const options =
                    !value.email || controllers.some((c) => c.email === value.email)
                      ? controllers
                      : [...controllers, { name: value.name || value.email, email: value.email }];

                  return (
                    <div key={role} className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-gray-600">{ROLE_LABELS[role]}</span>
                      <div className="relative">
                        <Select
                          value={value.email || UNASSIGNED}
                          disabled={pending}
                          onValueChange={(v) => assignOne(role, v === UNASSIGNED ? "" : v)}
                        >
                          <SelectTrigger
                            className={`h-9 w-full border px-2.5 text-[13px] shadow-none ${
                              value.name
                                ? overloaded
                                  ? "border-[#F6DDC2] text-[#B4530A]"
                                  : "border-gray-200 text-gray-900"
                                : "border-[#F5D5D5] bg-[#FDF8F8] font-semibold text-[#C23434]"
                            }`}
                          >
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                            {options.map((c) => (
                              <SelectItem key={c.email} value={c.email}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {pending && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
                            <Loader2 size={14} className="animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      {overloaded && (
                        <p className="text-[11px] text-[#B4530A]">
                          {value.name} carries {value.load} clients in this role, above the limit of {OVERLOAD}.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-8">
            <p className="mb-3 text-[11px] uppercase tracking-wide text-gray-400">Comments</p>
            <div className="flex flex-col gap-2">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Notes on this client"
                className="min-h-[80px] resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={!commentDraft.trim() || addCommentMutation.isPending}
                onClick={() => {
                  addCommentMutation.mutate(
                    { credId, comment: commentDraft },
                    {
                      onSuccess: () => {
                        setCommentDraft("");
                        queryClient.invalidateQueries({ queryKey: ["admin-placement-client-comments", credId] });
                      },
                      onError: () => toast.error("Failed to add comment"),
                    },
                  );
                }}
                className="flex items-center justify-center gap-1.5 self-end rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#004174] disabled:opacity-50"
              >
                {addCommentMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Add comment
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {commentsLoading ? (
                <p className="text-xs text-gray-400">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-gray-400">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-800">{c.authorName}</span>
                      <span className="text-[11px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">{c.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
