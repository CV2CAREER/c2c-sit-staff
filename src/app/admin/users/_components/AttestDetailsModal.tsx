import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// SPR-21-11-006 / SPR-21-11-010 — the three attest steps whose customer
// emails need a date/time (and, for the completion moments, an outcome
// note). Attesting these opens this form first; every other step keeps the
// one-click Attest.
// SPR-21-13-006 — the extension pair (eligibility result, decision
// approved/declined) uses the same form for a structured outcome instead of
// a date/time; the backend turns `outcome` into the town-crier line and the
// decision email's approved/declined wording.
export type AttestDetailsPayload = {
  scheduledAt?: string;
  note?: string;
  mode?: "scheduled" | "completed";
  outcome?: string;
};

type AttestDetailsConfig = {
  title: string;
  description: string;
  /** Absent = no date/time field (extension steps record an outcome only). */
  dateTimeLabel?: string;
  /** Steps where the appointment time is the whole point of the attest. */
  dateTimeRequired: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  /**
   * preference_review_session is a single journey step covering both moments
   * the DoD names (scheduled / completed), so the admin picks which one this
   * attest records: scheduled → invite email + .ics, completed → summary.
   */
  segmented?: boolean;
  /** SPR-21-13-006 — required structured outcome pills (Eligible / Approved…). */
  outcomeLabel?: string;
  outcomeOptions?: string[];
  outcomeRequired?: boolean;
};

export const ATTEST_DETAILS_STEPS: Record<string, AttestDetailsConfig> = {
  welcome_call_scheduled: {
    title: "Attest — Welcome Call Scheduled",
    description:
      "Record when the welcome call takes place. The customer is emailed the date and time and #town-crier is notified.",
    dateTimeLabel: "Call date & time",
    dateTimeRequired: true,
  },
  welcome_call_completed: {
    title: "Attest — Welcome Call Completed",
    description:
      "The customer receives a follow-up email with next steps and #town-crier is notified.",
    dateTimeLabel: "Call date & time (optional)",
    dateTimeRequired: false,
    noteLabel: "Next steps / notes (optional)",
    notePlaceholder: "Anything the customer should do next…",
  },
  preference_review_session: {
    title: "Attest — Preference Review Session",
    description:
      "Scheduled sends the customer a date and time email with a calendar invite (.ics). Completed sends the outcome summary. #town-crier is notified either way.",
    dateTimeLabel: "Session date & time",
    dateTimeRequired: true,
    noteLabel: "Outcome / notes (optional)",
    notePlaceholder: "Outcomes, decisions, next steps…",
    segmented: true,
  },
  // SPR-21-13-006 — Extension Eligibility Check: the review result goes to
  // #town-crier (DoD1); no date/time applies to this attest.
  extension_eligibility_check: {
    title: "Attest — Extension Eligibility Check",
    description:
      "Record the eligibility review result. The outcome is posted to #town-crier so the team can see whether the client qualifies for an extension.",
    dateTimeRequired: false,
    outcomeLabel: "Eligibility result",
    outcomeOptions: ["Eligible", "Not eligible"],
    outcomeRequired: true,
    noteLabel: "Review notes (optional)",
    notePlaceholder: "What did you check — social follows, referrals, engagement?",
  },
  // SPR-21-13-006 — Extension Decision Made: the decision (approved or
  // declined) is emailed to the customer (DoD2) and posted to #town-crier.
  extension_decision_made: {
    title: "Attest — Extension Decision Made",
    description:
      "Record the team's decision. The customer is emailed whether the extension was approved or declined, and #town-crier is notified.",
    dateTimeRequired: false,
    outcomeLabel: "Decision",
    outcomeOptions: ["Approved", "Declined"],
    outcomeRequired: true,
    noteLabel: "Reason / notes (optional)",
    notePlaceholder: "Why was this approved or declined?",
  },
};

const AttestDetailsModal = ({
  stepKey,
  open,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  stepKey: string;
  open: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (details: AttestDetailsPayload) => void;
}) => {
  const config = ATTEST_DETAILS_STEPS[stepKey];
  const [dateTime, setDateTime] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"scheduled" | "completed">("scheduled");
  const [outcome, setOutcome] = useState("");

  // A fresh form per step/attest — reopening must not show stale values.
  useEffect(() => {
    if (open) {
      setDateTime("");
      setNote("");
      setMode("scheduled");
      setOutcome("");
    }
  }, [open, stepKey]);

  if (!config) return null;

  const dateTimeRequired = config.segmented ? mode === "scheduled" : config.dateTimeRequired;
  const canConfirm =
    (!dateTimeRequired || dateTime !== "") && (!config.outcomeRequired || outcome !== "");

  const handleConfirm = () => {
    if (!canConfirm) return;
    const details: AttestDetailsPayload = {};
    if (dateTime) {
      const parsed = new Date(dateTime);
      if (!Number.isNaN(parsed.getTime())) {
        details.scheduledAt = parsed.toISOString();
      }
    }
    if (note.trim()) details.note = note.trim();
    if (config.segmented) details.mode = mode;
    if (outcome) details.outcome = outcome;
    onConfirm(details);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {config.segmented && (
            <div className="flex gap-2">
              {(["scheduled", "completed"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    mode === value
                      ? "border-career-blue-800 bg-career-blue-800 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-career-blue-800/40"
                  }`}
                >
                  {value === "scheduled" ? "Session scheduled" : "Session completed"}
                </button>
              ))}
            </div>
          )}

          {config.outcomeOptions && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {config.outcomeLabel}
                {config.outcomeRequired && <span className="text-red-500"> *</span>}
              </label>
              <div className="flex gap-2">
                {config.outcomeOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOutcome(value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      outcome === value
                        ? "border-career-blue-800 bg-career-blue-800 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-career-blue-800/40"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config.dateTimeLabel && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`attest-datetime-${stepKey}`} className="text-sm font-medium text-gray-700">
                {config.dateTimeLabel}
                {dateTimeRequired && <span className="text-red-500"> *</span>}
              </label>
              <Input
                id={`attest-datetime-${stepKey}`}
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required={dateTimeRequired}
              />
              {dateTimeRequired && (
                <p className="text-xs text-gray-500">
                  The customer email quotes this date and time.
                </p>
              )}
            </div>
          )}

          {config.noteLabel && (!config.segmented || mode === "completed") && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`attest-note-${stepKey}`} className="text-sm font-medium text-gray-700">
                {config.noteLabel}
              </label>
              <Textarea
                id={`attest-note-${stepKey}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={config.notePlaceholder}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-career-blue-800 text-white hover:bg-career-blue-500"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? "Attesting…" : "Attest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttestDetailsModal;
