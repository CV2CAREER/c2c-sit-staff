"use client";

import React, { useMemo, useState } from "react";
import {
  useAdminMutations,
  useAdminQueries,
} from "@/hooks/api/admin.api";
import {
  Eye,
  EyeOff,
  Copy,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import ExcelJS from "exceljs";
import { Dialog } from "@/components/ui/dialog";
import RejectCredentialModal from "./reject-credential-modal";
import ConfirmActionModal from "./confirm-action-modal";
import ImportCsvModal from "./import-csv-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const STATUS_TABS = [
  "all",
  "pending",
  "forwarded",
  "accepted",
  "active",
  "failed",
] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default function JobsiteCredentialsDataTable() {
  const { jobsiteCredentials, isJobsiteCredentialsLoading } = useAdminQueries({
    fetchJobsiteCredentials: true,
  });

  const {
    acceptJobsiteCredential,
    isAccepting,
    approveJobsiteCredential,
    isApproving,
    unapproveJobsiteCredential,
    isUnapproving,
    sendTestEmail,
    isSendingTestEmail,
    rejectJobsiteCredential,
    isRejecting,
    editJobsiteCredential,
    isEditing,
    revealJobsiteCredentialPassword,
  } = useAdminMutations();

  const [tab, setTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string | null>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    actionVariant?: "default" | "destructive";
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    actionLabel: "",
    onConfirm: () => {},
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const rawList: JobsiteCredential[] = useMemo(() => {
    if (Array.isArray(jobsiteCredentials)) {
      return jobsiteCredentials;
    }
    if (Array.isArray((jobsiteCredentials as any)?.data)) {
      return (jobsiteCredentials as any).data;
    }
    return [];
  }, [jobsiteCredentials]);

  const counts = useMemo(() => {
    const acc: Record<StatusTab, number> = {
      all: rawList.length,
      pending: 0,
      forwarded: 0,
      accepted: 0,
      active: 0,
      failed: 0,
    };
    for (const c of rawList) {
      if (c.status in acc) {
        acc[c.status as StatusTab] += 1;
      }
    }
    return acc;
  }, [rawList]);

  const filteredRows = useMemo(() => {
    let list = rawList;
    if (tab !== "all") {
      list = list.filter((c) => c.status === tab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const clientName = c.client
          ? `${c.client.firstName} ${c.client.lastName}`.toLowerCase()
          : "";
        const email = (c.email || "").toLowerCase();
        const reason = (c.rejectionReason || "").toLowerCase();
        return clientName.includes(q) || email.includes(q) || reason.includes(q);
      });
    }
    return list;
  }, [rawList, tab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const startItem = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredRows.length);

  const handleReveal = (id: string) => {
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

  const handleUnapproveClick = (row: JobsiteCredential) => {
    setConfirmModal({
      open: true,
      title: "Unapprove Credential",
      description:
        "This clears the current jobsite password and reverts to Accepted — applications will be blocked again until it's re-approved",
      actionLabel: "Unapprove",
      actionVariant: "destructive",
      onConfirm: () => {
        unapproveJobsiteCredential(
          { id: row.id },
          {
            onSuccess: () =>
              setConfirmModal((prev) => ({ ...prev, open: false })),
          }
        );
      },
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const buildExportRows = () =>
    filteredRows.map((c) => ({
      Client: c.client ? `${c.client.firstName} ${c.client.lastName}` : "",
      "Application Email": c.email,
      Status: STATUS_LABEL[c.status] ?? c.status,
      "Rejection Reason": c.rejectionReason ?? "—",
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

  const handleExportCsv = () => {
    const exportRows = buildExportRows();
    if (exportRows.length === 0) return;

    const headers = Object.keys(exportRows[0]);
    const lines = [
      headers.join(","),
      ...exportRows.map((row) =>
        headers.map((h) => `"${String((row as any)[h] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `jobsite-credentials-${tab}-${Date.now()}.csv`);
  };

  const handleExportExcel = async () => {
    const exportRows = buildExportRows();
    if (exportRows.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Jobsite Credentials");
    const headers = Object.keys(exportRows[0]);
    worksheet.columns = headers.map((h) => ({ header: h, key: h, width: 25 }));
    exportRows.forEach((row) => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `jobsite-credentials-${tab}-${Date.now()}.xlsx`);
  };

  const renderStatusPill = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f9ee] px-3 py-1 text-[11px] font-semibold text-[#16a34a] whitespace-nowrap">
            <CheckCircle2 size={12} /> Active
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6fe] px-3 py-1 text-[11px] font-semibold text-[#1e9ff2] whitespace-nowrap">
            <CheckCircle2 size={12} /> Accepted
          </span>
        );
      case "forwarded":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7e6] px-3 py-1 text-[11px] font-semibold text-[#b7791f] whitespace-nowrap">
            <Clock size={12} /> Forwarded
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7e6] px-3 py-1 text-[11px] font-semibold text-[#b7791f] whitespace-nowrap">
            <Clock size={12} /> Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecec] px-3 py-1 text-[11px] font-semibold text-[#dc2626] whitespace-nowrap">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f2f6] px-3 py-1 text-[11px] font-semibold text-[#8a8fa3] whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  return (
    <section className="flex flex-col gap-5 pt-2">
      {/* Level 3 Filter Tabs (Blue active state with counts) & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                tab === t
                  ? "border-[#1e9ff2] bg-[#1e9ff2] text-white shadow-sm"
                  : "border-[#ececf2] bg-white text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c]"
              }`}
            >
              {t === "all" ? "All Credentials" : STATUS_LABEL[t]} ({counts[t]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-60 items-center gap-2 rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 shadow-sm">
            <Search size={14} className="text-[#8a8fa3]" />
            <input
              type="text"
              placeholder="Search client, email or reason"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full border-none bg-transparent text-xs text-[#14143c] outline-none placeholder:text-[#8a8fa3]"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c] shadow-sm whitespace-nowrap shrink-0"
            title="Export CSV"
          >
            <Upload size={14} /> Export
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#8a8fa3] hover:border-[#c9d3e0] hover:text-[#14143c] shadow-sm whitespace-nowrap shrink-0"
          >
            <Download size={14} /> Import CSV
          </button>
        </div>
      </div>

      {/* Credentials Table with # Column & Rejection Reason Column */}
      <div className="overflow-hidden rounded-2xl border border-[#ececf2] bg-white shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#ececf2] bg-[#fafbfd] text-[11px] font-bold uppercase tracking-wider text-[#8a8fa3]">
                <th className="w-12 px-3 py-3 text-right text-[#8a8fa3]">#</th>
                <th className="min-w-[160px] px-4 py-3">Client</th>
                <th className="min-w-[180px] px-4 py-3">Application Email</th>
                <th className="min-w-[170px] px-4 py-3">Jobsite Password</th>
                <th className="min-w-[110px] px-4 py-3">Status</th>
                <th className="min-w-[150px] px-4 py-3">Rejection Reason</th>
                <th className="min-w-[110px] px-4 py-3">Last Updated</th>
                <th className="min-w-[150px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ececf2]">
              {isJobsiteCredentialsLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#8a8fa3]">
                    Loading credentials…
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#8a8fa3]">
                    {rawList.length === 0
                      ? "No credentials yet"
                      : "No credentials match this filter and search combination."}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const sn = (currentPage - 1) * pageSize + idx + 1;
                  const clientName = row.client
                    ? `${row.client.firstName} ${row.client.lastName}`
                    : "Unknown";
                  const isEditingThis = editingId === row.id;
                  const revealed = revealedPasswords[row.id];
                  const isActive = row.status === "active";

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-[#fafbfd]">
                      <td className="px-3 py-3.5 text-right font-medium text-[#8a8fa3]">
                        {sn}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#14143c]">
                          {clientName}
                        </div>
                        <div className="text-[11px] text-[#8a8fa3]">
                          {row.client?.email || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isEditingThis ? (
                          <input
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="h-8 w-full rounded border border-gray-300 px-2 text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-[#14143c]">
                              {row.email}
                            </span>
                            <button
                              onClick={() => copyToClipboard(row.email, "Email")}
                              className="text-[#8a8fa3] hover:text-[#14143c]"
                              title="Copy email"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isEditingThis ? (
                          <input
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="h-8 w-full rounded border border-gray-300 px-2 text-xs"
                          />
                        ) : !isActive && !revealed ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2 font-mono text-xs text-[#14143c]">
                            <span className="tracking-widest">
                              {revealed ?? "••••••••"}
                            </span>
                            <button
                              onClick={() => handleReveal(row.id)}
                              className="text-[#8a8fa3] hover:text-[#14143c] p-0.5 rounded transition"
                              title={
                                revealed
                                  ? "Hide password"
                                  : "Reveal password — this action is logged"
                              }
                            >
                              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            {revealed && (
                              <button
                                onClick={() => copyToClipboard(revealed, "Password")}
                                className="text-[#8a8fa3] hover:text-[#14143c]"
                                title="Copy password"
                              >
                                <Copy size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {renderStatusPill(row.status)}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.rejectionReason ? (
                          <span className="text-xs font-semibold text-red-600 line-clamp-2">
                            {row.rejectionReason}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[#8a8fa3] whitespace-nowrap">
                        {row.updatedAt
                          ? new Date(row.updatedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {isEditingThis ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(row.id)}
                                disabled={isEditing}
                                className="rounded-lg bg-[#1e9ff2] px-3 py-1 text-xs font-semibold text-white hover:bg-[#1a8ddb]"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="rounded-lg border border-[#ececf2] bg-white px-3 py-1 text-xs font-semibold text-[#8a8fa3] hover:border-[#c9d3e0]"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {row.status === "forwarded" && (
                                <button
                                  onClick={() =>
                                    acceptJobsiteCredential({ id: row.id })
                                  }
                                  disabled={isAccepting}
                                  className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#1e9ff2] hover:border-[#1e9ff2] hover:bg-[#eaf6fe]"
                                >
                                  Accept
                                </button>
                              )}

                              {row.status === "accepted" && (
                                <>
                                  <button
                                    onClick={() =>
                                      sendTestEmail({ id: row.id })
                                    }
                                    disabled={isSendingTestEmail}
                                    className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#1e9ff2] hover:border-[#1e9ff2] hover:bg-[#eaf6fe] disabled:opacity-50"
                                  >
                                    Test
                                  </button>
                                  <button
                                    onClick={() =>
                                      approveJobsiteCredential({ id: row.id })
                                    }
                                    disabled={isApproving}
                                    className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#16a34a] hover:border-[#16a34a] hover:bg-[#e6f9ee] disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                </>
                              )}

                              {row.status !== "active" && row.status !== "failed" && (
                                <button
                                  onClick={() => setRejectingId(row.id)}
                                  disabled={isRejecting}
                                  className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:border-[#dc2626] hover:bg-[#fdecec]"
                                >
                                  Reject
                                </button>
                              )}

                              {row.status === "active" && (
                                <button
                                  onClick={() => handleUnapproveClick(row)}
                                  disabled={isUnapproving}
                                  className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#8a8fa3] hover:border-[#dc2626] hover:text-[#dc2626] hover:bg-[#fdecec] disabled:opacity-50"
                                >
                                  Unapprove
                                </button>
                              )}

                              <button
                                onClick={() => handleStartEdit(row)}
                                className="rounded-lg border border-[#ececf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#14143c] hover:border-[#c9d3e0]"
                              >
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Attached & Sticky Bottom of Table Pager */}
        <div className="sticky bottom-0 z-20 border-t border-[#ececf2] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8a8fa3] shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="whitespace-nowrap">
              Showing {startItem}-{endItem} of {filteredRows.length} credentials
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8a8fa3] whitespace-nowrap">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[72px] rounded-lg border border-[#ececf2] bg-white px-2.5 text-xs text-[#14143c] outline-none focus:border-[#1e9ff2]">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent className="w-[72px] min-w-[72px] bg-white border border-[#ececf2] rounded-lg shadow-lg z-[100]">
                  <SelectItem value="10" className="text-xs py-1.5 px-2">10</SelectItem>
                  <SelectItem value="20" className="text-xs py-1.5 px-2">20</SelectItem>
                  <SelectItem value="50" className="text-xs py-1.5 px-2">50</SelectItem>
                  <SelectItem value="100" className="text-xs py-1.5 px-2">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1 text-xs font-semibold text-[#14143c] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    currentPage === p
                      ? "bg-[#1e9ff2] text-white"
                      : "text-[#14143c] hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-[#ececf2] bg-white px-3 py-1 text-xs font-semibold text-[#14143c] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        {rejectingId && (
          <RejectCredentialModal
            credentialId={rejectingId}
            onReject={(reason: JobsiteCredentialRejectionReason, note?: string) => {
              rejectJobsiteCredential(
                { id: rejectingId, reason, note },
                { onSuccess: () => setRejectingId(null) },
              );
            }}
            onClose={() => setRejectingId(null)}
            isRejecting={isRejecting}
          />
        )}
      </Dialog>

      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) =>
          setConfirmModal((prev) => ({ ...prev, open }))
        }
      >
        {confirmModal.open && (
          <ConfirmActionModal
            title={confirmModal.title}
            description={confirmModal.description}
            confirmLabel={confirmModal.actionLabel}
            destructive={confirmModal.actionVariant === "destructive"}
            onConfirm={confirmModal.onConfirm}
            onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
            isConfirming={isApproving || isUnapproving}
          />
        )}
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        {isImportOpen && (
          <ImportCsvModal onClose={() => setIsImportOpen(false)} />
        )}
      </Dialog>
    </section>
  );
}
