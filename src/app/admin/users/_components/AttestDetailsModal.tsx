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
export type AttestDetailsPayload = {
  scheduledAt?: string;
  note?: string;
  mode?: "scheduled" | "completed";
};

type AttestDetailsConfig = {
  title: string;
  description: string;
  dateTimeLabel: string;
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

  // A fresh form per step/attest — reopening must not show stale values.
  useEffect(() => {
    if (open) {
      setDateTime("");
      setNote("");
      setMode("scheduled");
    }
  }, [open, stepKey]);

  if (!config) return null;

  const dateTimeRequired = config.segmented ? mode === "scheduled" : config.dateTimeRequired;
  const canConfirm = !dateTimeRequired || dateTime !== "";

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
