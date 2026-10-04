"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FaqCategory } from "@/types/faq.types";

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  categories: FaqCategory[];
  onSave: (name: string) => Promise<void>;
  isSaving: boolean;
}

export function AddCategoryModal({
  open,
  onClose,
  categories,
  onSave,
  isSaving,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const trimmed = name.trim();
  // Same check the API makes — catch "payments" vs "Payments" before sending.
  const duplicate = categories.find(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Categories are a fixed list — authors pick from it, they never type one.
          </p>
        </DialogHeader>

        <div className="grid gap-1.5 py-2">
          <label className="text-sm font-medium text-gray-700">
            Category name <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Interviews & Offers"
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !duplicate) void onSave(trimmed);
            }}
          />
          {duplicate && (
            <p className="text-xs text-red-600">
              &quot;{duplicate.name}&quot; already exists — use that one instead.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSave(trimmed)}
            disabled={isSaving || !trimmed || !!duplicate}
          >
            {isSaving ? "Adding..." : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
