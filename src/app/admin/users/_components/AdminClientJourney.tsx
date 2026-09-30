import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Flag,
  type LucideIcon,
  Milestone,
  PartyPopper,
  Radio,
  RotateCcw,
  Rocket,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoDocument } from "react-icons/io5";
import ConfirmActionModal from "../../jobsite-credentials/_components/confirm-action-modal";
import {
  useApproveDocument,
  useGetUserPendingDocuments,
} from "../hooks/users-all";
import {
  NO_AUTO_TRIGGER_STEP_KEYS,
  deriveJourneyState,
} from "@/constants/clientJourneySteps";
import { ClientJourneyPhaseKey } from "@/types/client-journey.types";
import TriggerApplicationAction from "./ApplicationAction";

// document_accepted has no "Attest" action — it's driven by the existing
// document-approval pipeline (UserManagementService.approveUserDocument),
// so this surfaces that same action inline instead of a generic Attest
// button, letting an admin approve a pending document right from the
// journey panel.
interface PendingDocument {
  id: string;
  type: string;
  status: string;
  document?: { name?: string };
}

const DocumentAcceptAction = ({
  userId,
  onAccepted,
}: {
  userId: string;
  onAccepted: () => void;
}) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const { data: pendingResponse, isLoading } = useGetUserPendingDocuments(userId);
  const approveDocument = useApproveDocument();

  const pendingDocuments: PendingDocument[] = (pendingResponse as any)?.data ?? [];

  if (isLoading) {
    return <div className="h-7 w-28 animate-pulse rounded-full bg-gray-100" />;
  }

  if (pendingDocuments.length === 0) {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-500">
        No pending document
      </span>
    );
  }

  const toggleDocument = (documentId: string) => {
    const next = new Set(selectedDocuments);
    if (next.has(documentId)) next.delete(documentId);
    else next.add(documentId);
    setSelectedDocuments(next);
  };

  const handleClose = () => {
    setSelectedDocuments(new Set());
    setOpen(false);
  };

  const handleAcceptSelected = async () => {
    const toastId = toast.loading(`Accepting ${selectedDocuments.size} document(s)…`);

    try {
      await Promise.all(
        Array.from(selectedDocuments).map((documentId) =>
          approveDocument.mutateAsync({ documentId }),
        ),
      );
      toast.dismiss(toastId);
      toast.success(`${selectedDocuments.size} document(s) accepted`);
      queryClient.invalidateQueries({ queryKey: ["user-pending-documents", userId] });
      onAccepted();
      handleClose();
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to accept some documents");
    }
  };

  return (
    <>
      <Button
        size="sm"
        className="bg-career-blue-800 text-white shadow-sm hover:bg-career-blue-500"
        onClick={() => setOpen(true)}
      >
        Accept Document{pendingDocuments.length > 1 ? `s (${pendingDocuments.length})` : ""}
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept pending documents</DialogTitle>
            <DialogDescription>
              Select which of this client&apos;s pending documents to accept.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[320px] space-y-2 overflow-y-auto py-2">
            {pendingDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  selectedDocuments.has(doc.id)
                    ? "border-career-blue-800/30 bg-career-blue-800/5"
                    : "border-transparent bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(doc.id)}
                  onChange={() => {}}
                  className="h-4 w-4 rounded border-gray-300 text-career-blue-800 focus:ring-career-blue-800"
                />
                <IoDocument
                  className={`h-5 w-5 ${selectedDocuments.has(doc.id) ? "text-career-blue-800" : "text-gray-400"}`}
                />
                <div className="flex-1">
                  <div className="font-medium">{doc.document?.name ?? doc.type}</div>
                  <div className="text-sm text-gray-500">
                    {doc.type} · {doc.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              disabled={selectedDocuments.size === 0 || approveDocument.isPending}
              onClick={handleAcceptSelected}
            >
              Accept Selected ({selectedDocuments.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PHASE_DOT_STYLE: Record<string, string> = {
  done: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]",
  current:
    "bg-gradient-to-br from-career-blue-800 to-career-blue-500 text-white shadow-[0_2px_14px_rgba(0,142,211,0.45)] ring-4 ring-career-blue-800/15",
  pending: "bg-gray-100 text-gray-400 border border-gray-200",
};

const PHASE_LINE_STYLE: Record<string, string> = {
  done: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  current: "bg-gradient-to-r from-emerald-400 to-career-blue-800",
  pending: "bg-gray-200",
};

const PHASE_ICON: Record<ClientJourneyPhaseKey, LucideIcon> = {
  "getting-started": Rocket,
  welcome: PartyPopper,
  toolkit: Wrench,
  "final-checks": ClipboardCheck,
  "campaign-live": Radio,
  "campaign-review": BarChart3,
  "campaign-ended": Flag,
};

const STEP_ROW_ACCENT: Record<string, string> = {
  done: "border-emerald-100 bg-emerald-50/40",
  current: "border-career-blue-800/15 bg-career-blue-800/[0.03]",
  awaiting: "border-gray-100 bg-white",
};

const formatCompletedAt = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Admin-only counterpart to the client's read-only journey view (already
// shipped on the customer side). No "submitted"/Verify state here — the
// client UI never lets clients self-report, so every no-auto-trigger step
// only ever needs a single Attest action from staff.
const AdminClientJourney = ({ userId }: { userId: string }) => {
  const { clientJourney, isClientJourneyLoading } = useAdminQueries({
    userId,
    fetchClientJourney: true,
  });
  const { attestStep, isAttesting, reopenStep, isReopening } = useAdminMutations();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();

  const handleDocumentAccepted = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-client-journey", userId] });
  };

  const [expandedPhase, setExpandedPhase] = useState<ClientJourneyPhaseKey | null>(null);
  // SPR-21-02-006 fix: until the user picks a phase dot themselves, the open
  // section must keep tracking the profile's real current phase. Without this
  // the first render derives "getting-started" from the still-empty journey
  // response and latches expandedPhase to it forever, hiding the wrong
  // section (and Commence/End) on every fresh page load.
  const [phaseWasManuallySelected, setPhaseWasManuallySelected] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(true);
  const [pendingStepKey, setPendingStepKey] = useState<string | null>(null);
  const [reopenTarget, setReopenTarget] = useState<{ stepKey: string; label: string } | null>(null);
  const [showFullJourney, setShowFullJourney] = useState(false);

  const { phases, currentPhaseKey } = useMemo(
    () => deriveJourneyState(clientJourney?.steps ?? []),
    [clientJourney],
  );

  const { doneCount, totalCount } = useMemo(() => {
    const allSteps = phases.flatMap((phase) => phase.steps);
    return {
      doneCount: allSteps.filter((step) => step.state === "done").length,
      totalCount: allSteps.length,
    };
  }, [phases]);

  const overallPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (!phaseWasManuallySelected && currentPhaseKey) {
      setExpandedPhase(currentPhaseKey);
    }
  }, [currentPhaseKey, phaseWasManuallySelected]);

  useEffect(() => {
    setStepsOpen(true);
  }, [expandedPhase]);

  const activePhase = phases.find((phase) => phase.key === expandedPhase) ?? null;

  const handleAttest = (stepKey: string) => {
    setPendingStepKey(stepKey);
    attestStep(
      { clientId: userId, stepKey },
      { onSettled: () => setPendingStepKey(null) },
    );
  };

  const handleReopen = (stepKey: string) => {
    setPendingStepKey(stepKey);
    reopenStep(
      { clientId: userId, stepKey },
      { onSettled: () => setPendingStepKey(null) },
    );
  };

  const handleConfirmReopen = () => {
    if (!reopenTarget) return;
    handleReopen(reopenTarget.stepKey);
    setReopenTarget(null);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      className="relative rounded-2xl border border-career-blue-800/10 bg-white shadow-[0_4px_24px_rgba(0,142,211,0.08)] transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,142,211,0.14)]"
    >
      <div className="flex flex-col gap-4 rounded-t-2xl border-b border-gray-100 bg-gradient-to-br from-career-blue-800/5 via-white to-white p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Milestone size={20} />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-career-black-200 md:text-2xl">Customer Journey</h3>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 md:p-6">
        {isClientJourneyLoading ? (
          <div className="h-24 animate-pulse rounded-md bg-gray-100" />
        ) : (
          <>
            <AnimatePresence mode="wait">
              {activePhase && (
                <motion.div
                  key={activePhase.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="border-t border-gray-100 pt-4"
                >
                  {/* SPR-21-02-006: Commence/End moved here from the old
                      standalone Trigger Action card — each button lives only
                      in its own phase section header, and only while the
                      profile is actually in that phase. */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setStepsOpen((prev) => !prev)}
                      aria-expanded={stepsOpen}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left transition-colors hover:text-career-blue-800"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-career-black-200">{activePhase.label}</h4>
                        {activePhase.key === currentPhaseKey && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-career-blue-800/10 px-2.5 py-0.5 text-[10.5px] font-bold text-career-blue-800">
                            <Sparkles size={11} />
                            Current phase
                          </span>
                        )}
                      </div>
                      <motion.span
                        animate={{ rotate: stepsOpen ? 180 : 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="shrink-0 text-gray-400"
                      >
                        <ChevronDown size={16} />
                      </motion.span>
                    </button>
                    {activePhase.key === "campaign-live" && currentPhaseKey === "campaign-live" && (
                      <TriggerApplicationAction action="commence" userId={userId} />
                    )}
                    {activePhase.key === "campaign-ended" && currentPhaseKey === "campaign-ended" && (
                      <TriggerApplicationAction action="end" userId={userId} />
                    )}
                  </div>

                  {/* SPR-21-02-007: sim order is phase cardhead (with
                      Commence/End) -> compact-phase -> phaselist: the
                      one-line indicator replaces the icon stepper, the
                      "X of Y steps complete" label and the progress bar;
                      the full stepper opens on demand below it. */}
                  <div className="mb-4 flex items-center gap-2.5 overflow-x-auto whitespace-nowrap text-[11.5px] text-[#0F1E2E]">
                    <span>
                      <b className="font-bold">Phase:</b>{" "}
                      {activePhase.label}
                    </span>
                    <span className="text-[11px] font-bold text-[#0876A8]">· {overallPercent}% ·</span>
                    <button
                      type="button"
                      onClick={() => setShowFullJourney((prev) => !prev)}
                      className="text-[10.5px] text-[#5B6B7C] underline transition-colors hover:text-[#0876A8]"
                    >
                      {showFullJourney ? "hide full journey ↑" : "view full journey >"}
                    </button>
                  </div>

                  {showFullJourney && (
                    <div className="mb-6 flex items-start gap-0 overflow-x-auto overflow-y-visible pt-4 pb-1">
                      {phases.map((phase, index) => {
                        const PhaseIcon = PHASE_ICON[phase.key];

                        return (
                          <button
                            key={phase.key}
                            type="button"
                            onClick={() => {
                              setPhaseWasManuallySelected(true);
                              setExpandedPhase(phase.key);
                            }}
                            className="group relative min-w-[104px] flex-1 px-1 text-center"
                          >
                            {index > 0 && (
                              <span
                                className={`absolute left-[-50%] top-[17px] h-[3px] w-full transition-colors ${PHASE_LINE_STYLE[phase.state]}`}
                              />
                            )}
                            <span className="relative z-10 mx-auto mb-2 block h-9 w-9">
                              {phase.state === "current" && (
                                <span className="absolute inset-0 animate-ping rounded-full bg-career-blue-800 opacity-75" />
                              )}
                              <motion.span
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.96 }}
                                className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${PHASE_DOT_STYLE[phase.state]}`}
                              >
                                {phase.state === "done" ? <CheckCircle2 size={17} /> : <PhaseIcon size={15} />}
                              </motion.span>
                            </span>
                            <span
                              className={`block text-[10.5px] font-semibold leading-tight transition-colors ${
                                phase.key === expandedPhase
                                  ? "text-career-blue-800"
                                  : "text-gray-400 group-hover:text-gray-600"
                              }`}
                            >
                              {phase.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {stepsOpen && (
                      <motion.div
                        key="steps"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                    <div className="flex flex-col gap-2">
                      {activePhase.steps.map((step) => {
                        const isPending =
                          pendingStepKey === step.stepKey && (isAttesting || isReopening);

                        return (
                          <div
                            key={step.stepKey}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors ${STEP_ROW_ACCENT[step.state]}`}
                          >
                            <div className="flex items-center gap-2.5">
                              {step.state === "done" ? (
                                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                              ) : (
                                <span
                                  className={`h-2 w-2 shrink-0 rounded-full ${
                                    step.state === "current" ? "bg-career-blue-800" : "bg-gray-300"
                                  }`}
                                />
                              )}
                              <span className="text-sm font-medium text-career-black-200">{step.label}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {step.state === "done" && step.completion ? (
                                <>
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                    {step.completion.actorType} · {formatCompletedAt(step.completion.completedAt)}
                                  </span>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReopenTarget({ stepKey: step.stepKey, label: step.label })
                                      }
                                      disabled={isPending}
                                      title="Reopen — undo this completion"
                                      className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                  )}
                                </>
                              ) : step.stepKey === "document_accepted" ? (
                                isAdmin ? (
                                  <DocumentAcceptAction userId={userId} onAccepted={handleDocumentAccepted} />
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                    Needs admin review
                                  </span>
                                )
                              ) : NO_AUTO_TRIGGER_STEP_KEYS.has(step.stepKey) ? (
                                isAdmin ? (
                                  <Button
                                    size="sm"
                                    className="bg-career-blue-800 text-white shadow-sm hover:bg-career-blue-500"
                                    onClick={() => handleAttest(step.stepKey)}
                                    disabled={isPending}
                                  >
                                    {isPending ? "Attesting…" : "Attest"}
                                  </Button>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                    Needs admin attestation
                                  </span>
                                )
                              ) : (
                                <>
                                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                                    Client step
                                  </span>
                                  {isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-career-blue-800/20 text-career-blue-800 hover:bg-career-blue-800/5"
                                      onClick={() => handleAttest(step.stepKey)}
                                      disabled={isPending}
                                    >
                                      {isPending ? "Attesting…" : "Attest"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <Dialog open={!!reopenTarget} onOpenChange={(open) => !open && setReopenTarget(null)}>
        {reopenTarget && (
          <ConfirmActionModal
            title={`Reopen "${reopenTarget.label}"?`}
            description="This undoes the completion — the step goes back to not-done, and whoever completed it stays on record in the step's history."
            confirmLabel="Reopen"
            isConfirming={isReopening}
            destructive
            onConfirm={handleConfirmReopen}
            onClose={() => setReopenTarget(null)}
          />
        )}
      </Dialog>
    </motion.div>
  );
};

export default AdminClientJourney;
