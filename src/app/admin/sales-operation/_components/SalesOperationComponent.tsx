"use client";

import React, { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { IoRefreshSharp as RefreshIcon } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Table from "@/components/newTable/Table";
import {
  useSalesOperationQueries,
  useSalesOperationMutations,
} from "@/hooks/api/admin/sales-operation";
import {
  australiaTerritory,
  entityReviewStatus,
  partnerType,
  adoptionStatus,
} from "./data-options";

// ─── Types ──────────────────────────────────────────────────────────────────

type FieldType = "text" | "select";

interface FormFieldDef {
  field: string;
  label: string;
  type: FieldType;
  options?: string[];
}

const FORM_FIELDS: FormFieldDef[] = [
  { field: "salesExecutive", label: "Sales Executive", type: "text" },
  { field: "name", label: "Name", type: "text" },
  { field: "partnerType", label: "Partner Type", type: "select", options: partnerType },
  { field: "australiaTerritory", label: "Territory", type: "select", options: australiaTerritory },
  { field: "adoptionStatus", label: "Adoption Status", type: "select", options: adoptionStatus },
  { field: "entryReviewStatus", label: "Entry Review Status", type: "select", options: entityReviewStatus },
  { field: "primaryContactEmail", label: "Primary Contact Email", type: "text" },
  { field: "secondaryContactFullName", label: "Secondary Contact", type: "text" },
  { field: "secondaryContactEmail", label: "Secondary Email", type: "text" },
  { field: "secondaryPhoneNumber", label: "Secondary Phone", type: "text" },
  { field: "webPage", label: "Web Page", type: "text" },
  { field: "linkedinPage", label: "LinkedIn Page", type: "text" },
  { field: "followUpCallStatus", label: "Follow Up Call Status", type: "text" },
  { field: "commsDispatchDate", label: "Comms Dispatch Date", type: "text" },
  { field: "entryCreationDate", label: "Entry Creation Date", type: "text" },
  { field: "lastContactDate", label: "Last Contact Date", type: "text" },
  { field: "verifiedEmail", label: "Verified Email", type: "text" },
  { field: "notes", label: "Notes", type: "text" },
];

const emptyForm = Object.fromEntries(FORM_FIELDS.map((f) => [f.field, ""]));

// ─── Confirm Modal ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Entry Form ──────────────────────────────────────────────────────────────

function EntryForm({
  values,
  onChange,
  isLoading,
}: {
  values: Record<string, string>;
  onChange: (field: string, val: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FORM_FIELDS.map((f) => (
        <div key={f.field} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{f.label}</label>
          {f.type === "select" ? (
            <Select
              value={values[f.field] || ""}
              onValueChange={(v) => onChange(f.field, v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select ${f.label}`} />
              </SelectTrigger>
              <SelectContent>
                {(f.options ?? []).sort((a, b) => a.localeCompare(b)).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              disabled={isLoading}
              value={values[f.field] || ""}
              onChange={(e) => onChange(f.field, e.target.value)}
              placeholder={f.label}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SalesOperationComponent() {
  const [isRecycle, setIsRecycle] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, string>>(emptyForm);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>(emptyForm);

  // Confirm dialogs
  const [confirmSoftDelete, setConfirmSoftDelete] = useState<string | null>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const { activeDataDomain, recycleDataDomain } = useSalesOperationQueries({
    fetchActive: !isRecycle,
    fetchRecycle: isRecycle,
  });

  const {
    createMutation,
    updateMutation,
    softDeleteMutation,
    hardDeleteMutation,
    restoreMutation,
  } = useSalesOperationMutations();

  const domain = isRecycle ? recycleDataDomain : activeDataDomain;
  const data = domain.data ?? [];
  const isLoading = domain.isLoading;

  // Sync edit form when a row is selected
  useEffect(() => {
    if (editRow) {
      const vals: Record<string, string> = {};
      FORM_FIELDS.forEach((f) => {
        vals[f.field] = editRow[f.field] ?? "";
      });
      setEditForm(vals);
    }
  }, [editRow]);

  // ── Handlers ──

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(createForm);
      setCreateOpen(false);
      setCreateForm(emptyForm);
    } catch {
      /* error handled in hook */
    }
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    try {
      await updateMutation.mutateAsync({ ...editForm, _id: editRow._id });
      setEditOpen(false);
      setEditRow(null);
    } catch {
      /* error handled in hook */
    }
  };

  const handleDelete = (id: string) => {
    if (isRecycle) {
      setConfirmHardDelete(id);
    } else {
      setConfirmSoftDelete(id);
    }
  };

  // modifyArray for the shared Table — strips internal fields, adds restore in recycle view
  function modifyArray(arr: any[]) {
    const filtered = arr.filter(
      (col) =>
        col.field !== "__v" &&
        col.field !== "isDeleted" &&
        col.field !== "createdAt" &&
        col.field !== "updatedAt"
    );

    // Edit button column
    filtered.unshift({
      field: "edit",
      headerName: "Edit",
      width: 80,
      headerClassName: "bg-[#80D7FF]",
      renderCell: (params: any) => (
        <button
          disabled={!editMode}
          onClick={() => {
            setEditRow(params.row);
            setEditOpen(true);
          }}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            editMode
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Edit
        </button>
      ),
    });

    if (isRecycle) {
      filtered.unshift({
        field: "restore",
        headerName: "Restore",
        width: 90,
        headerClassName: "bg-[#80D7FF]",
        renderCell: (params: any) => (
          <button
            onClick={() => setConfirmRestore(params.row._id || params.row.id)}
            className="text-green-600 hover:text-green-800 transition-colors"
            title="Restore"
          >
            <RefreshIcon size={18} />
          </button>
        ),
      });
    }

    return filtered;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-[#008ED3] hover:bg-[#0073a8] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Entry
        </Button>

        <Button
          onClick={() => setIsRecycle((v) => !v)}
          className="flex items-center gap-2 bg-[#008ED3] hover:bg-[#0073a8] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
        >
          <Trash2Icon className="w-4 h-4" />
          {isRecycle ? "View Active" : "Recycle Bin"}
        </Button>
      </div>

      {/* ── Table ── */}
      <Table
        data={data}
        helpers={{}}
        allowDelete
        modifyArray={modifyArray}
        tableName={`SALES_OPERATION_${isRecycle ? "RECYCLE" : "ACTIVE"}`}
        editMode={editMode}
        setEditMode={setEditMode}
        handleDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* ── Create Modal ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#008ED3]">
              Create New Sales Operation Entry
            </DialogTitle>
          </DialogHeader>
          <EntryForm
            values={createForm}
            onChange={(f, v) => setCreateForm((p) => ({ ...p, [f]: v }))}
            isLoading={createMutation.isPending}
          />
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-[#008ED3] hover:bg-[#0073a8] text-white"
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#008ED3]">
              Edit Sales Operation Entry
            </DialogTitle>
          </DialogHeader>
          <EntryForm
            values={editForm}
            onChange={(f, v) => setEditForm((p) => ({ ...p, [f]: v }))}
            isLoading={updateMutation.isPending}
          />
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-[#008ED3] hover:bg-[#0073a8] text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Soft Delete ── */}
      <ConfirmDialog
        open={!!confirmSoftDelete}
        title="Move to Recycle Bin?"
        description="This entry will be moved to the recycle bin and can be recovered later."
        confirmLabel="Move to Recycle Bin"
        destructive
        onConfirm={async () => {
          if (confirmSoftDelete) {
            await softDeleteMutation.mutateAsync({ id: confirmSoftDelete });
            setConfirmSoftDelete(null);
          }
        }}
        onCancel={() => setConfirmSoftDelete(null)}
      />

      {/* ── Confirm Hard Delete ── */}
      <ConfirmDialog
        open={!!confirmHardDelete}
        title="Permanently Delete?"
        description="This action cannot be undone. The entry will be permanently removed."
        confirmLabel="Delete Permanently"
        destructive
        onConfirm={async () => {
          if (confirmHardDelete) {
            await hardDeleteMutation.mutateAsync({ id: confirmHardDelete });
            setConfirmHardDelete(null);
          }
        }}
        onCancel={() => setConfirmHardDelete(null)}
      />

      {/* ── Confirm Restore ── */}
      <ConfirmDialog
        open={!!confirmRestore}
        title="Restore Entry?"
        description="This entry will be moved back to the active list."
        confirmLabel="Restore"
        onConfirm={async () => {
          if (confirmRestore) {
            await restoreMutation.mutateAsync({ id: confirmRestore });
            setConfirmRestore(null);
          }
        }}
        onCancel={() => setConfirmRestore(null)}
      />
    </div>
  );
}
