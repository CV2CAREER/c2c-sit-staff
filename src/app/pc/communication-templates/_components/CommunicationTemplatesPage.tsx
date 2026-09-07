"use client";

import { Accordion, AccordionDetails, AccordionSummary, MenuItem, Select } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FaEdit, FaSearch, FaTrashAlt, FaUndo } from "react-icons/fa";
import { FaCheck, FaChevronDown, FaEye, FaFileExport, FaPaperPlane, FaPlus } from "react-icons/fa6";
import { ArrowLeft, Layers, Mail, ShieldCheck, Sparkles, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import FilterSelect from "./FilterSelect";
import { TriggersTab } from "./TriggersTab";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader/PageHeader";
import {
  CommunicationTemplate,
  EmailTemplateType,
  useCommunicationTemplates,
} from "@/hooks/useCommunicationTemplates";
import { PreviewModal } from "../_modals/PreviewModal";
import { DeleteConfirmModal } from "../_modals/DeleteConfirmModal";
import { CreateOrEditModal } from "../_modals/CreateOrEditModal";
import { MissingInfoModal } from "../_modals/MissingInfoModal";

const TYPE_META: Record<
  EmailTemplateType,
  { label: string; badge: string; icon: React.ReactNode; accent: string; avatar: string; headerTint: string }
> = {
  customer: {
    label: "Customer",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    icon: <Mail size={14} />,
    accent: "before:bg-gradient-to-b before:from-[#004174] before:to-[#00568f]",
    avatar: "bg-gradient-to-br from-[#004174] to-[#00568f] text-white",
    headerTint: "bg-gradient-to-r from-blue-50 to-white hover:from-blue-100",
  },
  admin: {
    label: "Admin",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    icon: <ShieldCheck size={14} />,
    accent: "before:bg-gradient-to-b before:from-amber-500 before:to-amber-300",
    avatar: "bg-gradient-to-br from-amber-500 to-amber-400 text-white",
    headerTint: "bg-gradient-to-r from-amber-50 to-white hover:from-amber-100",
  },
};

export default function CommunicationTemplatesPage() {
  const [recycleBin, setRecycleBin] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EmailTemplateType | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"templates" | "triggers">("templates");

  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [missingInfoOpen, setMissingInfoOpen] = useState(false);

  const { usersDomain, templatesDomain, triggersDomain, actions } = useCommunicationTemplates({ recycleBin });
  const templates = templatesDomain.data;
  const loading = templatesDomain.isLoading;

  // ── Filtering & grouping ──────────────────────────────────────────────────

  const filteredTemplates = useMemo(() => {
    let result: CommunicationTemplate[] = templates;
    if (typeFilter) result = result.filter((t) => t.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.key?.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.body?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, typeFilter, searchQuery]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, CommunicationTemplate[]> = {};
    filteredTemplates.forEach((t) => {
      const key = t.type || "customer";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  useEffect(() => {
    const visible = Object.keys(groupedTemplates);
    setExpandedTypes((prev) => (prev.length ? prev.filter((p) => visible.includes(p)) : visible));
  }, [groupedTemplates]);

  const handleAccordionChange = (type: string) =>
    setExpandedTypes((prev) => (prev.includes(type) ? prev.filter((p) => p !== type) : [...prev, type]));

  // Derived from filteredTemplates (not the raw fetch) so these numbers always
  // match what's actually rendered below — otherwise an active search term or
  // type filter makes the stat cards disagree with the visible list.
  const stats = useMemo(
    () => ({
      total: filteredTemplates.length,
      customer: filteredTemplates.filter((t) => t.type === "customer").length,
      admin: filteredTemplates.filter((t) => t.type === "admin").length,
    }),
    [filteredTemplates],
  );

  // ── Toolbar helpers ───────────────────────────────────────────────────────

  const handleExport = (template: CommunicationTemplate) => {
    const blob = new Blob([template.body], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${template.key || "template"}.html`;
    link.click();
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const onSoftDelete = async () => {
    if (!selectedTemplate?.key) return;
    setDeleteLoading(true);
    const toastId = toast.loading("Moving to recycle bin...");
    try {
      await actions.softDeleteTemplate(selectedTemplate.key);
      toast.dismiss(toastId);
      toast.success("Template moved to recycle bin.");
      setDeleteOpen(false);
      setSelectedTemplate(null);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to move to bin.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (template: CommunicationTemplate) => {
    const toastId = toast.loading("Restoring template...");
    try {
      await actions.restoreTemplate(template.key);
      toast.dismiss(toastId);
      toast.success("Template restored.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to restore.");
    }
  };

  const handleSave = async (values: { key: string; name: string; type: EmailTemplateType; body: string; variables: string[] }) => {
    const isEditing = !!selectedTemplate?.id;
    const toastId = toast.loading(isEditing ? "Updating template..." : "Creating template...");
    try {
      if (isEditing && selectedTemplate) {
        await actions.updateTemplate({
          id: selectedTemplate.id,
          name: values.name,
          type: values.type,
          body: values.body,
          variables: values.variables,
        });
      } else {
        await actions.createTemplate(values);
      }
      toast.dismiss(toastId);
      toast.success(isEditing ? "Template updated." : "Template created.");
      setCreateEditOpen(false);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to save template.");
    }
  };

  const handleTestSend = async (template: CommunicationTemplate) => {
    const toastId = toast.loading("Sending test email...");
    try {
      const { variables, triggerKeyUsed } = await actions.resolveTestSend(template.id);
      const result = await actions.sendTestEmail({ templateId: template.id, values: variables, triggerKeyUsed });
      toast.dismiss(toastId);
      toast.success(`Test email sent to ${result.recipientEmail}`);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to send test email.");
    }
  };

  const handleNotify = async (payload: { userId: string; missingInfoType: string; missingInfoUrl: string; mode: "email" | "whatsapp" }) => {
    const method = payload.mode === "email" ? "Email" : "WhatsApp";
    const toastId = toast.loading(`Sending ${method} notification...`);
    try {
      await actions.notifyMissingInfo(payload);
      toast.dismiss(toastId);
      toast.success(`${method} notification sent successfully.`);
      setMissingInfoOpen(false);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to send notification.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Email Templates"
        description="The content every automated email is built from"
        renderJSX={
          <Button variant="outline" className="text-sm" onClick={() => setMissingInfoOpen(true)}>
            Send Missing Information
          </Button>
        }
      />

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gray-50" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total templates</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-50" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#004174] to-[#00568f] text-white">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.customer}</p>
              <p className="text-xs text-gray-500 mt-1">Customer-facing</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-50" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-400 text-white">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.admin}</p>
              <p className="text-xs text-gray-500 mt-1">Admin / internal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === "templates" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("triggers")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === "triggers" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Triggers
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-5">
        {activeTab === "triggers" ? (
          <TriggersTab
            triggers={triggersDomain.data}
            templates={templatesDomain.data}
            isLoading={triggersDomain.isLoading}
            onRebind={(triggerKey, templateId) => actions.rebindTrigger({ triggerKey, templateId })}
            onReset={(triggerKey) => actions.resetTrigger(triggerKey)}
          />
        ) : (
        <>
        {/* Toolbar */}
        <div className="flex-col md:flex-row flex md:items-center md:justify-between gap-3">
          <div className="flex w-full md:w-fit justify-between items-center gap-4">
            <Button
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#004174] to-[#00568f] px-5 py-5 text-[14px] font-semibold text-white shadow-md shadow-blue-900/20 transition-all hover:shadow-lg hover:shadow-blue-900/30 hover:brightness-110 active:scale-[0.98] sm:text-[16px]"
              onClick={() => {
                setSelectedTemplate(null);
                setCreateEditOpen(true);
              }}
            >
              <FaPlus className="transition-transform group-hover:rotate-90" /> Create Template
            </Button>
            <div className="flex items-center gap-3 w-[14rem] text-[15px] sm:text-[17px] md:w-96 rounded-3xl px-4 py-2 bg-gray-100 border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-colors">
              <FaSearch className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by key, name or content"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none bg-transparent w-[150px] sm:flex-1 text-gray-700 focus:border-none py-0 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px] sm:placeholder:text-[16px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 justify-end">
            <Button
              onClick={() => setTypeFilter("")}
              className={`!bg-red-600 gap-2 !h-9 !w-9 items-center justify-center !text-white border border-gray-300 rounded-full ${typeFilter === "" ? "hidden" : "flex"}`}
            >
              <XIcon className="h-6 w-6" />
            </Button>
            <FilterSelect value={typeFilter} setValue={setTypeFilter} />
            <Select displayEmpty renderValue={() => <em>More</em>} className="h-8">
              <MenuItem disabled>More</MenuItem>
              <MenuItem onClick={() => setRecycleBin(!recycleBin)}>
                Recycle bin &nbsp;{recycleBin && <FaCheck />}
              </MenuItem>
            </Select>
          </div>
        </div>

        {/* Count bar */}
        <div className={`flex items-center justify-between border-t pt-3 ${recycleBin ? "border-red-100" : "border-gray-100"}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              {recycleBin && <FaUndo className="text-red-400" size={12} />}
              {recycleBin ? "Recycle Bin" : "Active Templates"}
            </div>
            {recycleBin && (
              <button
                type="button"
                onClick={() => setRecycleBin(false)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
              >
                <ArrowLeft size={12} /> Back to Active
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Showing {filteredTemplates.length} {recycleBin ? "deleted" : "active"} template
            {filteredTemplates.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Template list */}
        {loading ? (
          <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
            <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedTemplates).map(([type, group]) => {
              const meta = TYPE_META[type as EmailTemplateType] ?? TYPE_META.customer;
              return (
                <Accordion
                  key={type}
                  expanded={expandedTypes.includes(type)}
                  onChange={() => handleAccordionChange(type)}
                  className="!shadow-none border border-gray-200 rounded-lg overflow-hidden"
                  disableGutters
                >
                  <AccordionSummary
                    expandIcon={<FaChevronDown className="text-gray-500" />}
                    className={`${meta.headerTint} transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.badge}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className="text-gray-500 text-sm">{group.length} template{group.length === 1 ? "" : "s"}</span>
                    </div>
                  </AccordionSummary>
                  <AccordionDetails className="p-3 bg-gray-50/50">
                    <div className="grid gap-2.5">
                      {group.map((template) => (
                        <div
                          key={template.id}
                          className={`relative flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3.5 pl-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-lg ${meta.accent}`}
                        >
                          <div className={`hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.avatar}`}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900 break-words">{template.name}</h4>
                                {recycleBin && (
                                  <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">
                                    Deleted
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate max-w-full sm:max-w-md font-mono mt-0.5">
                                {template.key}
                              </p>
                              {(template.updatedBy || template.updatedAt) && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {template.updatedBy && <>Updated by {template.updatedBy}</>}
                                  {template.updatedBy && template.updatedAt && " · "}
                                  {template.updatedAt &&
                                    formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 shrink-0">
                              <button
                                title="Preview"
                                className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500 transition-colors"
                                onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}
                              >
                                <FaEye />
                              </button>
                              <button
                                title="Edit"
                                className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                disabled={recycleBin}
                                onClick={() => { setSelectedTemplate(template); setCreateEditOpen(true); }}
                              >
                                <FaEdit />
                              </button>
                              <button
                                title="Send Test Email"
                                className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                disabled={recycleBin}
                                onClick={() => void handleTestSend(template)}
                              >
                                <FaPaperPlane />
                              </button>
                              <button
                                title="Export as .html"
                                className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500 transition-colors"
                                onClick={() => handleExport(template)}
                              >
                                <FaFileExport />
                              </button>
                              {recycleBin ? (
                                <button
                                  title="Restore"
                                  className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500 transition-colors"
                                  onClick={() => void handleRestore(template)}
                                >
                                  <FaUndo />
                                </button>
                              ) : (
                                <button
                                  title="Delete"
                                  className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                  onClick={() => { setSelectedTemplate(template); setDeleteOpen(true); }}
                                >
                                  <FaTrashAlt />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionDetails>
                </Accordion>
              );
            })}
            {Object.keys(groupedTemplates).length === 0 && (
              <div className="py-14 text-center flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100">
                  <Sparkles className="text-gray-400" size={24} />
                </div>
                <p className="text-sm text-gray-500">
                  {recycleBin ? "Recycle bin is empty." : "No templates found."}
                </p>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* Modals */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={selectedTemplate}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        templateLabel={selectedTemplate?.name ?? ""}
        onConfirm={onSoftDelete}
        loading={deleteLoading}
      />
      <CreateOrEditModal
        open={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        template={selectedTemplate?.id ? selectedTemplate : null}
        onSave={handleSave}
        isSaving={actions.isMutating}
      />
      <MissingInfoModal
        open={missingInfoOpen}
        onClose={() => setMissingInfoOpen(false)}
        users={usersDomain.data}
        onSend={handleNotify}
        isSending={actions.isMutating}
      />
    </div>
  );
}
