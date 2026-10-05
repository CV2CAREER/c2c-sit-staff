"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateUser } from "@/app/admin/users/hooks/users-all";

export type PerceptionField = "staffPerception";

/** Tuoyo's approved list (SPR-21-33-002). Must match the Perception enum on the backends. */
const OPTIONS: { value: string; className: string; tone: string }[] = [
  { value: "Critical", className: "text-red-600", tone: "border-red-300 bg-red-50 text-red-600" },
  { value: "Advocate", className: "text-emerald-700", tone: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "Satisfied", className: "text-blue-700", tone: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "Blacklisted", className: "text-purple-700", tone: "border-purple-300 bg-purple-50 text-purple-700" },
  { value: "TBD", className: "text-gray-500", tone: "border-gray-200 bg-white text-gray-500" },
];

/** Read-only coloured pill, so the plain-text cell carries the same colour as the dropdown. */
export function PerceptionBadge({ value }: { value?: string | null }) {
  const current = OPTIONS.find((o) => o.value === value);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${current?.tone ?? OPTIONS[4].tone}`}
    >
      {current?.value ?? "N/A"}
    </span>
  );
}

/**
 * Inline Staff Perception dropdown for a Users table row (SPR-21-33-002).
 * Always visible, so it does not depend on the edit modal; saves the one field through
 * the existing user-update endpoint and refreshes the users list.
 */
export default function PerceptionCell({
  userId,
  field,
  value,
}: {
  userId: string | number;
  field: PerceptionField;
  value?: string | null;
}) {
  const { mutateAsync: updateUser } = useUpdateUser();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const label = "Staff Perception";
  const current = OPTIONS.find((o) => o.value === value);

  const save = async (next: string) => {
    if (next === value) return;
    setSaving(true);
    const toastId = toast.loading(`Saving ${label}...`);
    try {
      await updateUser({ id: userId, [field]: next } as any);
      await queryClient.invalidateQueries({ queryKey: ["users-all"] });
      toast.success(`${label} set to ${next}`, { id: toastId });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || `Failed to save ${label}`, {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="w-full"
    >
      <Select value={current?.value} disabled={saving} onValueChange={save}>
        <SelectTrigger
          className={`h-8 w-full min-w-[140px] text-xs font-medium ${current?.tone ?? OPTIONS[4].tone}`}
        >
          <SelectValue placeholder={`Set ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className={`text-xs ${o.className}`}>
              {o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
