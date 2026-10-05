"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { Switch } from "@/components/ui/switch";

/**
 * SPR-21-33-001 - Audit Required (Yes/No toggle) and Audit Findings (free text) cells for grid rows.
 * "user" rows are Users Management rows (users table); "campaign" rows are Campaign Management
 * rows (credentials table). Both save one field through the row's existing update endpoint.
 */
export type AuditTarget = "user" | "campaign";

const UPDATE_URL: Record<AuditTarget, (id: string | number) => string> = {
  user: (id) => `/api/v1/user-management/users/${id}`,
  campaign: (id) => `/api/v1/campaigns/clients/${id}`,
};
const QUERY_KEYS: Record<AuditTarget, string[][]> = {
  user: [["users-all"]],
  campaign: [["admin-fetch-campaign-clients"], ["admin-campaigns"]],
};
const MAX_FINDINGS = 2000;

function useAuditSave(target: AuditTarget, rowId: string | number) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const save = async (field: "auditRequired" | "auditFindings", value: boolean | string | null, label: string) => {
    setSaving(true);
    const toastId = toast.loading(`Saving ${label}...`);
    try {
      await axiosInstance.patch(UPDATE_URL[target](rowId), { [field]: value });
      await Promise.all(QUERY_KEYS[target].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      toast.success(`${label} saved`, { id: toastId });
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || `Failed to save ${label}`, { id: toastId });
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { save, saving };
}

/** Yes/No toggle: on = the row is being considered for deletion. */
export function AuditRequiredToggle({ target, rowId, value }: { target: AuditTarget; rowId: string | number; value?: boolean | null }) {
  const { save, saving } = useAuditSave(target, rowId);
  const checked = !!value;
  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Switch
        checked={checked}
        disabled={saving}
        onCheckedChange={(next) => save("auditRequired", next, "Audit Required")}
        aria-label="Audit Required"
      />
      <span className={`text-xs font-medium ${checked ? "text-red-600" : "text-gray-500"}`}>{checked ? "Yes" : "No"}</span>
    </div>
  );
}

/** Free-text justification for the audit decision; saves when the field loses focus or Enter is pressed. */
export function AuditFindingsInput({ target, rowId, value }: { target: AuditTarget; rowId: string | number; value?: string | null }) {
  const { save, saving } = useAuditSave(target, rowId);
  const [text, setText] = useState(value ?? "");
  useEffect(() => setText(value ?? ""), [value]);

  const commit = async () => {
    const next = text.trim();
    if (next === (value ?? "")) return;
    const ok = await save("auditFindings", next === "" ? null : next, "Audit Findings");
    if (!ok) setText(value ?? "");
  };

  return (
    <input
      value={text}
      disabled={saving}
      maxLength={MAX_FINDINGS}
      placeholder="Add findings"
      title={text}
      aria-label="Audit Findings"
      className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
    />
  );
}
