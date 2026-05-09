"use client";

import { Accordion, AccordionDetails, AccordionSummary, MenuItem, Select } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaSearch, FaTrashAlt, FaUndo } from "react-icons/fa";
import { FaCheck, FaChevronDown, FaCopy, FaEye, FaFileExport, FaPlus } from "react-icons/fa6";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import FilterSelect from "./FilterSelect";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader/PageHeader";
import { CommunicationTemplate, useCommunicationTemplates } from "@/hooks/useCommunicationTemplates";
import { PreviewModal } from "../_modals/PreviewModal";
import { DeleteConfirmModal } from "../_modals/DeleteConfirmModal";
import { CreateOrEditModal } from "../_modals/CreateOrEditModal";
import { MissingInfoModal } from "../_modals/MissingInfoModal";

export default function CommunicationTemplatesPage() {
  const [recycleBin, setRecycleBin] = useState(false);
  const [filter, setFilter] = useState<{ persona: string; template: string }>({ persona: "", template: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPersonas, setExpandedPersonas] = useState<string[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [missingInfoOpen, setMissingInfoOpen] = useState(false);

  const { usersDomain, templatesDomain, actions } = useCommunicationTemplates({ recycleBin });
  const templates = templatesDomain.data;
  const loading = templatesDomain.isLoading;

  // ── Filtering & grouping ──────────────────────────────────────────────────

  const filteredTemplates = useMemo(() => {
    let result: CommunicationTemplate[] = templates;
    if (filter.persona) result = result.filter((t) => t.persona === filter.persona);
    if (filter.template) result = result.filter((t) => t.templateName === filter.template);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.templateName?.toLowerCase().includes(q) ||
          t.persona?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.body?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, filter, searchQuery]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, CommunicationTemplate[]> = {};
    filteredTemplates.forEach((t) => {
      const key = t.persona || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  useEffect(() => {
    const visible = Object.keys(groupedTemplates);
    setExpandedPersonas((prev) => prev.filter((p) => visible.includes(p)));
  }, [groupedTemplates]);

  const handleAccordionChange = (persona: string) =>
    setExpandedPersonas((prev) =>
      prev.includes(persona) ? prev.filter((p) => p !== persona) : [...prev, persona],
    );

  // ── Toolbar helpers ───────────────────────────────────────────────────────

  const handleExport = (body: string) => {
    const blob = new Blob([body], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template.html";
    link.click();
  };

  const triggerFileInput = () => document?.getElementById("fileInput")?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setSelectedTemplate({ templateName: "", persona: "", subject: "", body: content } as any);
    setCreateEditOpen(true);
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const onSoftDelete = async () => {
    if (!selectedTemplate?.templateName) return;
    setDeleteLoading(true);
    const toastId = toast.loading("Moving to recycle bin...");
    try {
      await actions.softDeleteTemplate(selectedTemplate.templateName);
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
      await actions.restoreTemplate(template.templateName);
      toast.dismiss(toastId);
      toast.success("Template restored.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to restore.");
    }
  };

  const handleDuplicate = async (template: CommunicationTemplate) => {
    const toastId = toast.loading("Duplicating template...");
    try {
      await actions.duplicateTemplate(template.templateName);
      toast.dismiss(toastId);
      toast.success("Template duplicated.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to duplicate.");
    }
  };

  const handleSave = async (values: { templateName: string; persona: string; subject: string; body: string }) => {
    const isEditing = !!selectedTemplate?.id;
    const toastId = toast.loading(isEditing ? "Updating template..." : "Creating template...");
    try {
      if (isEditing) {
        await actions.updateTemplate({ id: selectedTemplate.id, ...values });
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
    <div className="bg-white flex flex-col gap-6 p-5">
      <PageHeader
        title="Communication Templates"
        renderJSX={
          <Button variant="outline" className="text-sm" onClick={() => setMissingInfoOpen(true)}>
            Send Missing Information
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex-col md:flex-row flex md:items-center md:justify-between gap-3">
        <div className="flex w-full md:w-fit justify-between items-center gap-4">
          <Button
            className="flex items-center justify-center gap-1 text-white px-4 py-5 rounded-3xl sm:text-[16px] text-[14px]"
            onClick={() => {
              setSelectedTemplate(null);
              setCreateEditOpen(true);
            }}
          >
            <FaPlus /> Create
          </Button>
          <div className="flex items-center gap-3 w-[14rem] text-[15px] sm:text-[17px] md:w-96 rounded-3xl px-4 py-2 bg-gray-100">
            <FaSearch className="text-gray-400" />
            <input type="file" id="fileInput" accept=".html,.txt" onChange={handleImport} style={{ display: "none" }} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none bg-transparent w-[150px] sm:flex-1 text-gray-400 focus:border-none py-0 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px] sm:placeholder:text-[16px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 justify-end">
          <Button
            onClick={() => setFilter({ persona: "", template: "" })}
            className={`!bg-red-600 gap-2 !h-9 !w-9 items-center justify-center !text-white border border-gray-300 rounded-full ${filter.persona === "" && filter.template === "" ? "hidden" : "flex"}`}
          >
            <XIcon className="h-6 w-6" />
          </Button>
          <FilterSelect templates={templates} setFilter={setFilter} />
          <Select displayEmpty renderValue={() => <em>More</em>} className="h-8">
            <MenuItem disabled>More</MenuItem>
            <MenuItem onClick={() => setRecycleBin(!recycleBin)}>
              Recycle bin &nbsp;{recycleBin && <FaCheck />}
            </MenuItem>
            <MenuItem onClick={triggerFileInput}>Import template</MenuItem>
          </Select>
        </div>
      </div>

      {/* Count bar */}
      <div className="flex items-center justify-between">
        <div>{recycleBin ? "Recycle Bin" : "Active Templates"}</div>
        <p className="text-gray-500 text-sm">
          Showing {filteredTemplates.length} {recycleBin ? "deleted" : "active"} templates
        </p>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
          <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedTemplates).map(([persona, group]) => (
            <Accordion
              key={persona}
              expanded={expandedPersonas.includes(persona)}
              onChange={() => handleAccordionChange(persona)}
              className="shadow-sm border border-gray-200 rounded-lg overflow-hidden"
            >
              <AccordionSummary
                expandIcon={<FaChevronDown className="text-gray-500" />}
                className="bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-medium text-lg">
                  {persona}
                  <span className="text-gray-500 ml-2">{group.length}</span>
                </h3>
              </AccordionSummary>
              <AccordionDetails className="p-0">
                <div className="divide-y divide-gray-200">
                  {group.map((template, idx) => (
                    <div
                      key={idx}
                      className={`p-4 hover:bg-gray-50 transition-colors ${template.isDeleted ? "bg-red-50" : ""}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium break-words">
                            {template.templateName}
                            {template.isDeleted && (
                              <span className="ml-2 text-xs text-red-600 font-semibold">(Deleted)</span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 truncate max-w-full sm:max-w-md">
                            {template.subject || "No subject provided"}
                          </p>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                          <button
                            title="Preview"
                            className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500"
                            onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}
                          >
                            <FaEye />
                          </button>
                          <button
                            title="Edit"
                            className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500"
                            disabled={template.isDeleted}
                            onClick={() => { setSelectedTemplate(template); setCreateEditOpen(true); }}
                          >
                            <FaEdit />
                          </button>
                          <button
                            title="Duplicate"
                            className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500"
                            disabled={template.isDeleted}
                            onClick={() => void handleDuplicate(template)}
                          >
                            <FaCopy />
                          </button>
                          <button
                            title="Export"
                            className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500"
                            onClick={() => handleExport(template.body)}
                          >
                            <FaFileExport />
                          </button>
                          {template.isDeleted ? (
                            <button
                              title="Restore"
                              className="p-2 text-gray-600 hover:text-gray-100 rounded-full hover:bg-blue-500"
                              onClick={() => void handleRestore(template)}
                            >
                              <FaUndo />
                            </button>
                          ) : (
                            <button
                              title="Delete"
                              className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-red-50"
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
          ))}
          {Object.keys(groupedTemplates).length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">No templates found.</div>
          )}
        </div>
      )}

      {/* Modals */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={selectedTemplate}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        templateName={selectedTemplate?.templateName ?? ""}
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
