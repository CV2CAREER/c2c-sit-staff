"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MissingInfoTemplate } from "@/hooks/api/missing-info-template.api";
import { useActivePCs } from "@/hooks/api/queue-entry.api";

interface RaiseStaffTaskModalProps {
  open: boolean;
  onClose: () => void;
  template: MissingInfoTemplate;
  onRaise: (owner: { ownerId: string; ownerName: string }) => void;
  isRaising: boolean;
}

export default function RaiseStaffTaskModal({
  open,
  onClose,
  template,
  onRaise,
  isRaising,
}: RaiseStaffTaskModalProps) {
  const { pcs, isLoading, isError } = useActivePCs();
  const [ownerId, setOwnerId] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    setOwnerId("");
    setError("");
    onClose();
  };

  const handleSubmit = () => {
    const owner = pcs.find((pc) => pc.id === ownerId);
    if (!owner) {
      setError("Please choose who this task is assigned to");
      return;
    }
    onRaise({ ownerId: owner.id, ownerName: owner.name });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[440px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[17px] text-[#10365A]">Raise as staff task</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 py-2">
          <Label className="text-[12px] font-semibold text-[#1F2937] mb-1.5">Task</Label>
          <Input
            value={template.name}
            readOnly
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px] text-[#6B7280]"
          />

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">
            What this involves
          </Label>
          <Textarea
            value={template.description?.trim() || "No description added for this template."}
            readOnly
            rows={3}
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px] text-[#6B7280] min-h-[70px] resize-none"
          />

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Assign to *</Label>
          <select
            value={ownerId}
            onChange={(e) => {
              setOwnerId(e.target.value);
              setError("");
            }}
            disabled={isLoading || isError}
            className={`w-full rounded-lg border bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#1F2937] ${
              error ? "border-red-500" : "border-[#E5E9EF]"
            }`}
          >
            <option value="">
              {isLoading ? "Loading owners..." : isError ? "Could not load owners" : "Select an owner"}
            </option>
            {pcs.map((pc) => (
              <option key={pc.id} value={pc.id}>
                {pc.name}
              </option>
            ))}
          </select>
          {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

          <p className="mt-3.5 rounded-lg border border-[#E5E9EF] bg-[#F6F7F9] px-3 py-2.5 text-[12px] text-[#6B7280]">
            This creates a row in <b className="text-[#1F2937]">Outstanding Requests (Staff)</b>.
            Nothing runs automatically — the assignee does the actual database work, then comes back
            and resolves it.
          </p>
        </div>

        <DialogFooter className="gap-2.5 mt-1">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border border-[#E5E9EF] text-[#10365A] font-semibold text-[13px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isRaising || isLoading || isError}
            className="bg-[#6D4FD4] hover:bg-[#5b3fc0] text-white font-semibold text-[13px]"
          >
            {isRaising ? "Raising..." : "Raise task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
