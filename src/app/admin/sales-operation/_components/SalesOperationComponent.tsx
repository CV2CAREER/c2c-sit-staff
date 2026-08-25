"use client";

import React, { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormFieldDef {
  field: string;
  label: string;
  type: "text" | "select" | "date";
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
  { field: "commsDispatchDate", label: "Comms Dispatch Date", type: "date" },
  { field: "entryCreationDate", label: "Entry Creation Date", type: "date" },
  { field: "lastContactDate", label: "Last Contact Date", type: "date" },
  { field: "verifiedEmail", label: "Verified Email", type: "text" },
  { field: "notes", label: "Notes", type: "text" },
];

const emptyForm = Object.fromEntries(FORM_FIELDS.map((f) => [f.field, ""]));

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

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
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : f.type === "date" ? (
            <Input
              type="date"
              disabled={isLoading}
              value={values[f.field] || ""}
              onChange={(e) => onChange(f.field, e.target.value)}
              placeholder={f.label}
            />
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesOperationComponent() {
  const [isRecycle, setIsRecycle] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, string>>(emptyForm);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>(emptyForm);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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

  // Sync edit form when row selected
  useEffect(() => {
    if (editRow) {
      const vals: Record<string, string> = {};
      FORM_FIELDS.forEach((f) => {
        const raw = editRow[f.field];
        if (f.type === "date" && raw) {
          vals[f.field] = new Date(raw).toISOString().slice(0, 10);
        } else {
          vals[f.field] = raw ?? "";
        }
      });
      setEditForm(vals);
    }
  }, [editRow]);

  const normalizePayload = (payload: Record<string, string>) => {
    const next: Record<string, any> = { ...payload };
    const dateFields = ["commsDispatchDate", "entryCreationDate", "lastContactDate"];
    dateFields.forEach((field) => {
      const value = next[field];
      next[field] = value ? new Date(value).toISOString() : null;
    });
    if (typeof next.verifiedEmail === "string") {
      if (next.verifiedEmail.trim() === "") next.verifiedEmail = null;
      else next.verifiedEmail = next.verifiedEmail.toLowerCase() === "true";
    }
    return next;
  };

  // ── modifyArray ──
  // NOTE: editMode and openEdit are passed via helpers so Table's columnHeaders
  // useMemo (which has helpers in its deps) picks up changes reactively.
  function modifyArray(arr: any[], helpers: any) {
    const currentEditMode: boolean = helpers?.editMode ?? false;
    const openEdit: (row: any) => void = helpers?.openEdit ?? (() => {});

    const filtered = arr.filter(
      (col) =>
        !["__v", "isDeleted", "createdAt", "updatedAt", "createdBy", "updatedBy", "deletedBy", "deletedAt"].includes(col.field)
    );

    // Only show Edit column in active view
    if (!isRecycle) {
      filtered.unshift({
        field: "editAction",
        headerName: "Edit",
        width: 80,
        sortable: false,
        renderCell: (params: any) => (
          <button
            disabled={!currentEditMode}
            onClick={() => openEdit(params.row)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              currentEditMode
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Edit
          </button>
        ),
      });
    }

    return filtered;
  }

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(normalizePayload(createForm));
      setCreateOpen(false);
      setCreateForm(emptyForm);
    } catch { /* handled in hook */ }
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    try {
      await updateMutation.mutateAsync({ ...normalizePayload(editForm), _id: editRow._id });
      setEditOpen(false);
      setEditRow(null);
    } catch { /* handled in hook */ }
  };

  const handleDeleteMultiple = async (selectedIds: unknown) => {
    const ids = (Array.isArray(selectedIds) ? selectedIds : []).filter(Boolean) as string[];
    if (!ids.length) return;

    if (isRecycle) {
      await Promise.all(ids.map((id) => hardDeleteMutation.mutateAsync({ id })));
      return;
    }

    await Promise.all(ids.map((id) => softDeleteMutation.mutateAsync({ id })));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      {!isRecycle && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-[#008ED3] hover:bg-[#0073a8] text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      )}

      {/* Table — Show Deleted is in the actions prop (checkbox row) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4">
        <Table
          data={data}
          // Pass editMode + openEdit through helpers so modifyArray gets them reactively
          helpers={{ editMode, openEdit: (row: any) => { setEditRow(row); setEditOpen(true); } }}
          allowDelete={true}
          allowRestore={isRecycle}
          modifyArray={modifyArray}
          tableName={`SALES_OPERATION_${isRecycle ? "RECYCLE" : "ACTIVE"}`}
          editMode={editMode}
          setEditMode={setEditMode}
          handleDelete={(id: string) =>
            isRecycle ? setConfirmHardDelete(id as string) : setConfirmDelete(id as string)
          }
          onRowClick={(params: any) => {
            if (!isRecycle && editMode) {
              setEditRow(params?.row);
              setEditOpen(true);
            }
          }}
          cursorPointer={!isRecycle && editMode}
          handleRestore={(id: string) => setConfirmRestore(id as string)}
          handleDeleteMultiple={handleDeleteMultiple}
          isLoading={isLoading}
          actions={[
            {
              label: isRecycle ? "Show Active" : "Show Deleted",
              handler: () => {
                setIsRecycle((v) => !v);
                setEditMode(false); // reset edit mode when switching views
              },
              isChecked: isRecycle,
            },
          ]}
          checkBoxSelection={isRecycle}
        />
      </div>

      {/* Create Modal */}
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
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

      {/* Edit Modal */}
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
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

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Move to Recycle Bin?"
        description="This entry will be soft-deleted. You can view it by enabling 'Show Deleted'."
        confirmLabel="Move to Recycle Bin"
        onConfirm={async () => {
          if (confirmDelete) {
            await softDeleteMutation.mutateAsync({ id: confirmDelete });
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm Restore */}
      <ConfirmDialog
        open={!!confirmRestore}
        title="Restore Entry?"
        description="This entry will be moved back to the active list."
        confirmLabel="Restore Entry"
        onConfirm={async () => {
          if (confirmRestore) {
            await restoreMutation.mutateAsync({ id: confirmRestore });
            setConfirmRestore(null);
          }
        }}
        onCancel={() => setConfirmRestore(null)}
      />

      {/* Confirm Permanent Delete */}
      <ConfirmDialog
        open={!!confirmHardDelete}
        title="Permanently Delete?"
        description="This action cannot be undone."
        confirmLabel="Delete Permanently"
        onConfirm={async () => {
          if (confirmHardDelete) {
            await hardDeleteMutation.mutateAsync({ id: confirmHardDelete });
            setConfirmHardDelete(null);
          }
        }}
        onCancel={() => setConfirmHardDelete(null)}
      />
    </div>
  );
}
