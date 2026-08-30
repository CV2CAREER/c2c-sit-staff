"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DropdownOptionRow } from "@/hooks/api/dropdown-option.api";

export type OptionFormValues = { label: string; value: string; isActive: boolean };

const freshValues = (): OptionFormValues => ({ label: "", value: "", isActive: true });

interface CreateOrEditOptionModalProps {
  open: boolean;
  onClose: () => void;
  option: DropdownOptionRow | null;
  // Set when creating a child under a specific parent (e.g. a classification
  // under an industry) — null/undefined means a top-level row.
  parentLabel?: string | null;
  onSave: (values: OptionFormValues) => Promise<void>;
  isSaving: boolean;
}

export function CreateOrEditOptionModal({
  open,
  onClose,
  option,
  parentLabel,
  onSave,
  isSaving,
}: CreateOrEditOptionModalProps) {
  const [formValues, setFormValues] = useState<OptionFormValues>(freshValues());
  const isEditing = !!option;
  const isSystem = !!option?.isSystem;

  useEffect(() => {
    if (!open) return;
    setFormValues(
      option
        ? { label: option.label, value: option.value, isActive: option.isActive }
        : freshValues(),
    );
  }, [open, option]);

  const handleSave = async () => {
    if (!formValues.label.trim()) {
      toast.error("Label is required.");
      return;
    }
    if (!formValues.value.trim()) {
      toast.error("Value is required.");
      return;
    }
    await onSave(formValues);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Option" : "Create Option"}</DialogTitle>
          {parentLabel ? (
            <p className="text-sm text-gray-500 mt-1">Under &quot;{parentLabel}&quot;</p>
          ) : null}
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {isSystem && (
            <p className="text-xs text-indigo-700 bg-indigo-50 rounded-md px-3 py-2">
              This is a system option — its value is fixed since it&apos;s relied on by matching
              logic elsewhere. You can still change its label and active state.
            </p>
          )}

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Label <span className="text-red-500">*</span>
            </label>
            <Input
              value={formValues.label}
              onChange={(e) => setFormValues((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="What's shown to the customer"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Value <span className="text-red-500">*</span>
            </label>
            <Input
              value={formValues.value}
              disabled={isSystem}
              onChange={(e) => setFormValues((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="What's persisted on save"
            />
            <p className="text-xs text-gray-400">
              Changing this on an existing option can un-check it on preferences already saved
              with the old value.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-400">Inactive options are hidden from customers without deleting them.</p>
            </div>
            <Switch
              checked={formValues.isActive}
              onCheckedChange={(checked) => setFormValues((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
