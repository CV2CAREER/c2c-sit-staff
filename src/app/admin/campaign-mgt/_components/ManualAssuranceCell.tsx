"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import axiosInstance from "@/services/api-client";
import { ADMIN_DISCOVERY_TRACKER_ASSURANCE } from "@/constants/apiEndpoints/admin.endpoint";
import AssuranceSelect, { AssuranceStatus } from "@/components/AssuranceSelect/AssuranceSelect";

type SavedAssurance = {
  AssuranceStatus: AssuranceStatus | null;
  AssuredBy: string | null;
  AssuranceDate: string | null;
};

/**
 * Assurance dropdown for a row of the Manual Discovery table (SPR-21-58-001). Saves
 * straight to the manual_applications row; the server stamps who chose and when and
 * returns them so the row can be updated in place without reloading the table.
 */
export default function ManualAssuranceCell({
  row,
  onSaved,
  readOnly = false,
}: {
  row: { id: string | number; Assurance_Status?: string | null };
  onSaved: (saved: SavedAssurance) => void;
  /** True while "Allow Editing" is off: the value is shown but cannot be changed. */
  readOnly?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const save = async (assuranceStatus: AssuranceStatus | null) => {
    setSaving(true);
    const toastId = toast.loading("Saving assurance...");
    try {
      const response = await axiosInstance.patch(
        ADMIN_DISCOVERY_TRACKER_ASSURANCE,
        { assuranceStatus },
        { params: { id: row.id } },
      );
      const record = response.data?.data ?? {};
      onSaved({
        AssuranceStatus: record.AssuranceStatus ?? null,
        AssuredBy: record.AssuredBy ?? null,
        AssuranceDate: record.AssuranceDate ?? null,
      });
      toast.success("Assurance saved", { id: toastId });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save assurance", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AssuranceSelect
      value={row.Assurance_Status}
      disabled={saving || readOnly}
      title={readOnly ? "Turn on Allow Editing to change the assurance" : undefined}
      onChange={save}
    />
  );
}
