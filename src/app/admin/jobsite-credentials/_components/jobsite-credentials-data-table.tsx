"use client";
import React, { useMemo, useState } from "react";
import { GridColDef } from "@mui/x-data-grid-pro";
import { StyledDataGridPro } from "@/utils/table";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton, Tooltip } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/ui/search";
import ExcelJS from "exceljs";
import RejectCredentialModal from "./reject-credential-modal";
import ConfirmActionModal from "./confirm-action-modal";
import ImportCsvModal from "./import-csv-modal";
import {
  JobsiteCredential,
  JobsiteCredentialRejectionReason,
} from "@/types/jobsite-credential.types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  forwarded: "Forwarded",
  accepted: "Accepted",
  active: "Active",
  failed: "Failed",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  forwarded: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_TABS = [
  "all",
  "pending",
  "forwarded",
  "accepted",
  "active",
  "failed",
] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const JobsiteCredentialsDataTable: React.FC = () => {
  const { jobsiteCredentials, isJobsiteCredentialsLoading } = useAdminQueries({
    fetchJobsiteCredentials: true,
  });

  const {
    acceptJobsiteCredential,
    isAccepting,
    sendTestEmail,
    isSendingTestEmail,
    approveJobsiteCredential,
    isApproving,
    unapproveJobsiteCredential,
    isUnapproving,
    rejectJobsiteCredential,
    isRejecting,
    revealJobsiteCredentialPassword,
    editJobsiteCredential,
    isEditing,
  } = useAdminMutations();

  const [tab, setTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string | null>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Replaces window.confirm() — Accept and Unapprove both need a
  // confirmation step before firing, now via a real modal instead of the
  // native browser dialog.
  const [confirmingAction, setConfirmingAction] = useState<
    { type: "accept" | "unapprove"; id: string } | null
  >(null);

  const rows = useMemo(() => {
    let filtered =
      tab === "all"
        ? jobsiteCredentials
        : jobsiteCredentials.filter(
            (c: JobsiteCredential) => c.status === tab,
          );

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((c: JobsiteCredential) => {
        const clientName = c.client
          ? `${c.client.firstName} ${c.client.lastName}`.toLowerCase()
          : "";
        return (
          clientName.includes(query) || c.email.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [jobsiteCredentials, tab, searchQuery]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: jobsiteCredentials.length };
    for (const status of [
      "pending",
      "forwarded",
      "accepted",
      "active",
      "failed",
    ]) {
      base[status] = jobsiteCredentials.filter(
        (c: JobsiteCredential) => c.status === status,
      ).length;
    }
    return base;
  }, [jobsiteCredentials]);

  const handleAccept = (id: string) => {
    setConfirmingAction({ type: "accept", id });
  };

  const handleConfirmAction = () => {
    if (!confirmingAction) return;
    const { type, id } = confirmingAction;
    if (type === "accept") {
      acceptJobsiteCredential({ id }, { onSuccess: () => setConfirmingAction(null) });
    } else {
      unapproveJobsiteCredential({ id }, { onSuccess: () => setConfirmingAction(null) });
    }
  };

  const handleSendTestEmail = (id: string) => {
    sendTestEmail({ id });
  };

  const handleApprove = (id: string) => {
    approveJobsiteCredential({ id });
  };

  const handleReject = (
    id: string,
    reason: JobsiteCredentialRejectionReason,
    note?: string,
  ) => {
    rejectJobsiteCredential(
      { id, reason, note },
      { onSuccess: () => setRejectingId(null) },
    );
  };

  const handleReveal = (id: string) => {
    // Already revealed — just hide it locally, no need to re-hit the API
    // (and re-log an audit entry) for the same reveal.
    if (revealedPasswords[id]) {
      setRevealedPasswords((prev) => ({ ...prev, [id]: null }));
      return;
    }

    revealJobsiteCredentialPassword(
      { id },
      {
        onSuccess: (data: any) => {
          setRevealedPasswords((prev) => ({
            ...prev,
            [id]: data?.data?.password ?? null,
          }));
        },
      },
    );
  };

  const handleStartEdit = (row: JobsiteCredential) => {
    setEditingId(row.id);
    setEditEmail(row.email);
    setEditPassword(revealedPasswords[row.id] ?? row.generatedPassword ?? "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditEmail("");
    setEditPassword("");
  };

  const handleSaveEdit = (id: string) => {
    editJobsiteCredential(
      { id, email: editEmail, generatedPassword: editPassword },
      {
        onSuccess: () => {
          setRevealedPasswords((prev) => ({ ...prev, [id]: editPassword }));
          handleCancelEdit();
        },
      },
    );
  };

  // Client-side only — the rows are already loaded for the table, so
  // exporting them doesn't need a round trip to the backend. Exports
  // whatever the active status tab currently shows (rows), not the full
  // unfiltered set.
  const buildExportRows = () =>
    rows.map((c: JobsiteCredential) => ({
      Client: c.client ? `${c.client.firstName} ${c.client.lastName}` : "",
      "Application Email": c.email,
      Status: STATUS_LABEL[c.status] ?? c.status,
      "Rejection Reason": c.rejectionReason ?? "",
      "Last Updated": c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "",
    }));

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const csvCell = (value: unknown) => {
    const str = String(value ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const handleExportCsv = () => {
    const exportRows = buildExportRows();
    if (exportRows.length === 0) return;

    const headers = Object.keys(exportRows[0]);
    const lines = [
      headers.join(","),
      ...exportRows.map((row) =>
        headers.map((header) => csvCell((row as Record<string, unknown>)[header])).join(","),
      ),
    ];

    downloadBlob(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
      `jobsite-credentials-${tab}.csv`,
    );
  };

  const handleExportExcel = async () => {
    const exportRows = buildExportRows();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Jobsite Credentials");

    if (exportRows.length > 0) {
      worksheet.columns = Object.keys(exportRows[0]).map((key) => ({ header: key, key }));
      worksheet.addRows(exportRows);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `jobsite-credentials-${tab}.xlsx`,
    );
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "client",
        headerName: "Client",
        flex: 1,
        minWidth: 200,
        valueGetter: (_value, row) =>
          row.client ? `${row.client.firstName} ${row.client.lastName}` : "",
      },
      {
        field: "email",
        headerName: "Application Email",
        flex: 1,
        minWidth: 220,
        renderCell: (params) => {
          if (editingId === params.row.id) {
            return (
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-8"
              />
            );
          }
          return params.value;
        },
      },
      {
        field: "password",
        headerName: "Jobsite Password",
        width: 180,
        renderCell: (params) => {
          const id = params.row.id;
          const revealed = revealedPasswords[id];

          if (editingId === id) {
            return (
              <Input
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="h-8"
              />
            );
          }

          if (params.row.status !== "active") {
            return <span className="text-gray-400">—</span>;
          }
          return (
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
              <span className="tracking-widest truncate">
                {revealed ?? "••••••••"}
              </span>
              <Tooltip
                title={
                  revealed
                    ? "Hide password"
                    : "Reveal password — this action is logged"
                }
                placement="top"
                slotProps={{
                  popper: { style: { zIndex: 1500 } },
                }}
              >
                <IconButton size="small" onClick={() => handleReveal(id)}>
                  {revealed ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <span
            className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              STATUS_STYLE[params.value] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {STATUS_LABEL[params.value] ?? params.value}
          </span>
        ),
      },
      {
        field: "rejectionReason",
        headerName: "Rejection Reason",
        flex: 1,
        minWidth: 200,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => params.value || "—",
      },
      {
        field: "updatedAt",
        headerName: "Last Updated",
        width: 160,
        align: "center",
        headerAlign: "center",
        renderCell: (params) =>
          params.value ? new Date(params.value).toLocaleString() : "—",
      },
      {
        field: "pipeline",
        headerName: "Pipeline",
        width: 320,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params) => {
          if (editingId === params.row.id) return null;

          const status = params.row.status;
          const id = params.row.id;

          if (status === "forwarded") {
            return (
              <Button
                size="sm"
                onClick={() => handleAccept(id)}
                disabled={isAccepting}
              >
                Accept
              </Button>
            );
          }

          if (status === "accepted") {
            const canDecide = !!params.row.testedAt;
            return (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendTestEmail(id)}
                  disabled={isSendingTestEmail}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(id)}
                  disabled={!canDecide || isApproving}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-500"
                  onClick={() => setRejectingId(id)}
                  disabled={!canDecide}
                >
                  Reject
                </Button>
              </div>
            );
          }

          if (status === "active") {
            return (
              <Button
                size="sm"
                variant="outline"
                className="border-red-500 text-red-500"
                onClick={() => setConfirmingAction({ type: "unapprove", id })}
                disabled={isUnapproving}
              >
                Unapprove
              </Button>
            );
          }

          // pending or failed — nothing to do here yet (pending waits on
          // the client; failed is a terminal state until resubmitted).
          return <span className="text-gray-400">—</span>;
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 170,
        sortable: false,
        renderCell: (params) => {
          if (editingId === params.row.id) {
            return (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <Button
                  size="sm"
                  className="px-2.5"
                  onClick={() => handleSaveEdit(params.row.id)}
                  disabled={isEditing}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2.5"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            );
          }

          const status = params.row.status;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status !== "active" && status !== "failed" && (
                  <>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setRejectingId(params.row.id)}
                    >
                      Reject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => handleStartEdit(params.row)}>
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      isAccepting,
      isSendingTestEmail,
      isApproving,
      isUnapproving,
      isEditing,
      revealedPasswords,
      editingId,
      editEmail,
      editPassword,
    ],
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          {STATUS_TABS.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
            >
              {t === "all" ? "All Credentials" : STATUS_LABEL[t]} ({counts[t]})
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)}>
            Import from CSV
          </Button>
        </div>
      </div>

      <SearchInput
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search by client or email"
        className="h-9 w-[220px] rounded-md border border-input bg-white px-3 py-2 shadow-sm text-sm"
      />

      <StyledDataGridPro
        initialState={{
          pagination: {
            paginationModel: { pageSize: 20 },
          },
        }}
        rows={rows}
        getRowId={(row) => row.id}
        rowHeight={44}
        disableRowSelectionOnClick
        rowBufferPx={100}
        columns={columns}
        columnBufferPx={5}
        loading={isJobsiteCredentialsLoading}
        pagination
      />

      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        {rejectingId && (
          <RejectCredentialModal
            credentialId={rejectingId}
            isRejecting={isRejecting}
            onClose={() => setRejectingId(null)}
            onReject={(reason, note) => handleReject(rejectingId, reason, note)}
          />
        )}
      </Dialog>

      <Dialog
        open={!!confirmingAction}
        onOpenChange={(open) => !open && setConfirmingAction(null)}
      >
        {confirmingAction && (
          <ConfirmActionModal
            title={
              confirmingAction.type === "accept"
                ? "Accept this credential?"
                : "Unapprove this credential?"
            }
            description={
              confirmingAction.type === "accept"
                ? "This confirms the client has completed email forwarding, and the client will no longer be able to edit this email."
                : "This clears the current jobsite password and reverts to Accepted — applications will be blocked again until it's re-approved."
            }
            confirmLabel={confirmingAction.type === "accept" ? "Accept" : "Unapprove"}
            isConfirming={confirmingAction.type === "accept" ? isAccepting : isUnapproving}
            destructive={confirmingAction.type === "unapprove"}
            onConfirm={handleConfirmAction}
            onClose={() => setConfirmingAction(null)}
          />
        )}
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={(open) => setIsImportOpen(open)}>
        {isImportOpen && (
          <ImportCsvModal onClose={() => setIsImportOpen(false)} />
        )}
      </Dialog>
    </section>
  );
};

export default JobsiteCredentialsDataTable;
