import React, { useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOBSITE_CREDENTIAL_REJECTION_REASONS,
  JobsiteCredentialRejectionReason,
} from "@/types/jobsite-credential.types";

interface RejectCredentialModalProps {
  credentialId: string;
  onReject: (reason: JobsiteCredentialRejectionReason, note?: string) => void;
  onClose: () => void;
  isRejecting: boolean;
}

// Reject is DISABLED until a reason is chosen — the reason is mandatory
// and comes from a closed list, never free text. A client whose job
// search is on hold should never receive an arbitrary sentence.
const RejectCredentialModal: React.FC<RejectCredentialModalProps> = ({
  onReject,
  onClose,
  isRejecting,
}) => {
  const [reason, setReason] = useState<JobsiteCredentialRejectionReason | "">(
    "",
  );
  const [note, setNote] = useState("");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reject this credential</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Reason — required</label>
          <Select
            value={reason}
            onValueChange={(value) =>
              setReason(value as JobsiteCredentialRejectionReason)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {JOBSITE_CREDENTIAL_REJECTION_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Notes to the client (optional)
          </label>
          <Textarea
            placeholder="Anything specific they need to do."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Closed list, not free text. A client should never receive an
          arbitrary sentence explaining why their job search is on hold.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!reason || isRejecting}
          onClick={() => reason && onReject(reason, note)}
        >
          Reject credential
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default RejectCredentialModal;
