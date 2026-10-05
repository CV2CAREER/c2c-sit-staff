"use client";

import { useEffect, useState } from "react";
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

export interface HousekeepingTemplateValues {
  name: string;
  status: "draft" | "published";
  description: string;
}

interface HousekeepingTemplateModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing template when editing; omit when creating. */
  template?: MissingInfoTemplate | null;
  onSave: (values: HousekeepingTemplateValues) => void;
  isSaving: boolean;
}

/**
 * Simple task form for Database (Housekeeping) templates. These are internal
 * cleanup tasks, so they skip the customer field builder entirely.
 */
export default function HousekeepingTemplateModal({
  open,
  onClose,
  template,
  onSave,
  isSaving,
}: HousekeepingTemplateModalProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setStatus(template?.status ?? "draft");
    setDescription(template?.description ?? "");
    setNameError("");
  }, [open, template]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError("Enter a template name");
      return;
    }
    onSave({ name: name.trim(), status, description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[17px] text-[#10365A]">
            {template ? "Edit housekeeping template" : "New housekeeping template"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 py-2">
          <Label className="text-[12px] font-semibold text-[#1F2937] mb-1.5">Template name *</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            placeholder="e.g. Test profile purge"
            className={`bg-[#F9FAFB] rounded-lg text-[13px] border ${
              nameError ? "border-red-500" : "border-[#E5E9EF]"
            }`}
          />
          {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Category</Label>
          <Input
            value="Database (Housekeeping)"
            readOnly
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px] text-[#6B7280]"
          />

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            className="w-full rounded-lg border border-[#E5E9EF] bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#1F2937]"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">
            What this involves
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Removes staff test/dummy client profiles from live lists."
            rows={4}
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px] min-h-[80px] resize-y"
          />
          <p className="text-[11px] text-[#9CA3AF] mt-1">
            Shown to whoever raises and is assigned the task. Housekeeping templates are never sent to clients.
          </p>
        </div>

        <DialogFooter className="gap-2.5 mt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="border border-[#E5E9EF] text-[#10365A] font-semibold text-[13px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-[#0B96D6] hover:bg-[#0a86c0] text-white font-semibold text-[13px]"
          >
            {isSaving ? "Saving..." : template ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
