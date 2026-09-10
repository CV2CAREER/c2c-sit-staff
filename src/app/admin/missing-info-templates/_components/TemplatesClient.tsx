"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useFetchData } from "@/hooks/useApi";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import * as templateEndpoints from "@/constants/apiEndpoints/missing-info-template.endpoint";
import {
  MissingInfoTemplate,
  useMissingInfoTemplates,
  useSendRequest,
} from "@/hooks/api/missing-info-template.api";
import TemplateCard from "./TemplateCard";
import EmptyState from "./EmptyState";
import SendMissingInfoRequestModal from "../_modals/SendMissingInfoRequestModal";

type Client = {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  role?: string;
  isEmailVerified?: boolean;
};

export default function TemplatesClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<MissingInfoTemplate | null>(null);
  const [sendModalTemplate, setSendModalTemplate] = useState<MissingInfoTemplate | null>(null);

  const { data: usersData, isLoading: usersLoading } = useFetchData<{ users: Client[]; count: number }>({
    method: "GET",
    url: endpoints.USER_ALL,
    queryKey: ["missing-info-users"],
    enabled: true,
  });

  const clients = useMemo(() => {
    const users = usersData?.data?.users ?? [];
    return users
      .filter((user) => user.role === "client" && user.isEmailVerified !== false)
      .sort((a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.middleName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.middleName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [usersData]);

  const { sendRequest, isSending } = useSendRequest();

  const { templatesDomain, actions } = useMissingInfoTemplates(
    activeCategory ? { category: activeCategory } : undefined,
  );

  const templates = templatesDomain.data;
  const loading = templatesDomain.isLoading;
  const isError = templatesDomain.isError;

  const allCount = templates.length;
  const publishedCount = templates.filter((t) => t.status === "published").length;
  const draftsCount = templates.filter((t) => t.status === "draft").length;

  const filteredTemplates = useMemo(() => {
    let result = [...templates];
    if (activeTab === "published") {
      result = result.filter((t) => t.status === "published");
    } else if (activeTab === "drafts") {
      result = result.filter((t) => t.status === "draft");
    } else if (activeTab === "most-used") {
      result = [...result].sort((a, b) => b.publishCount - a.publishCount).slice(0, 10);
    }
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    return result;
  }, [templates, activeTab, activeCategory]);

  const hasAnyTemplates = templates.length > 0;

  const handleNewTemplate = async () => {
    const toastId = toast.loading("Creating template...");
    try {
      const allRes = await axiosInstance.get(templateEndpoints.MISSING_INFO_TEMPLATES);
      const allTemplates: MissingInfoTemplate[] = allRes.data?.data ?? [];
      const maxNum = allTemplates.reduce((max, t) => {
        const match = t.name?.match(/^Untitled Template (\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const newName = `Untitled Template ${maxNum + 1}`;
      await actions.createTemplate({
        name: newName,
        category: "references",
        type: "free_form",
      });
      toast.dismiss(toastId);
      const result = await templatesDomain.refetch();
      const created = result.data?.data?.find((t) => t.name === newName);
      if (created?.id) {
        router.push(`/admin/missing-info-templates/builder/${created.id}`);
      } else {
        router.push("/admin/missing-info-templates");
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || "Failed to create template.");
    }
  };

  const handleEdit = (template: MissingInfoTemplate) => {
    if (template?.id) {
      router.push(`/admin/missing-info-templates/builder/${template.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const toastId = toast.loading("Deleting template...");
    try {
      await actions.deleteTemplate(deleteConfirm.id);
      toast.dismiss(toastId);
      toast.success("Template deleted.");
      setDeleteConfirm(null);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete template.");
    }
  };

  const handlePublish = async (template: MissingInfoTemplate) => {
    const toastId = toast.loading("Publishing template...");
    try {
      await actions.publishTemplate(template.id);
      toast.dismiss(toastId);
      toast.success("Template published.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || "Failed to publish template.");
    }
  };

  const handleSend = (template: MissingInfoTemplate) => {
    setSendModalTemplate(template);
  };

  const handleSendRequest = async (payload: {
    clientId: string;
    templateId: string;
    jobApplicationId?: string;
    personalMessage?: string;
    channel: "email" | "whatsapp";
  }) => {
    const client = clients.find((c) => c.id === payload.clientId);
    const clientName =
      [client?.firstName, client?.middleName, client?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || client?.email || "the client";
    const requestType = sendModalTemplate?.name || "Missing-Info";

    const toastId = toast.loading(`Sending "${requestType}" request to ${clientName}...`);
    try {
      await sendRequest(payload);
      toast.dismiss(toastId);
      toast.success(`"${requestType}" request sent to ${clientName}.`);
      setSendModalTemplate(null);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || `Failed to send "${requestType}" request to ${clientName}.`);
    }
  };

  return (
    <div className="bg-[#F3F4F6] flex flex-col gap-0 p-0 min-h-screen">
      {/* Header */}
      <div className="bg-white px-7 py-4 border-b border-[#E5E9EF]">
        <div className="flex items-center gap-3">
          <a
            href="/admin/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E9EF] transition-colors text-[#10365A]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <h1 className="text-[20px] font-bold text-[#10365A] m-0">Missing Information</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-6 bg-white px-7 py-3.5 border-b border-[#E5E9EF]">
        <button
          onClick={() => setActiveTab("all")}
          className={`text-[13px] font-semibold pb-1 transition-colors ${
            activeTab === "all"
              ? "text-[#0B96D6] border-b-2 border-[#0B96D6]"
              : "text-[#6B7280] hover:text-[#1F2937]"
          }`}
        >
          All Templates{" "}
          <span className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-full ${
            activeTab === "all" ? "bg-[#0B96D6] text-white" : "bg-[#EAF4FE] text-[#0B96D6]"
          }`}>{allCount}</span>
        </button>
        <button
          onClick={() => setActiveTab("published")}
          className={`text-[13px] font-semibold pb-1 transition-colors ${
            activeTab === "published"
              ? "text-[#0B96D6] border-b-2 border-[#0B96D6]"
              : "text-[#6B7280] hover:text-[#1F2937]"
          }`}
        >
          Published{" "}
          <span className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-full ${
            activeTab === "published" ? "bg-[#0B96D6] text-white" : "bg-[#EAF4FE] text-[#0B96D6]"
          }`}>{publishedCount}</span>
        </button>
        <button
          onClick={() => setActiveTab("drafts")}
          className={`text-[13px] font-semibold pb-1 transition-colors ${
            activeTab === "drafts"
              ? "text-[#0B96D6] border-b-2 border-[#0B96D6]"
              : "text-[#6B7280] hover:text-[#1F2937]"
          }`}
        >
          Drafts{" "}
          <span className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-full ${
            activeTab === "drafts" ? "bg-[#0B96D6] text-white" : "bg-[#EAF4FE] text-[#0B96D6]"
          }`}>{draftsCount}</span>
        </button>
        <button
          onClick={() => setActiveTab("most-used")}
          className={`text-[13px] font-semibold pb-1 transition-colors ${
            activeTab === "most-used"
              ? "text-[#0B96D6] border-b-2 border-[#0B96D6]"
              : "text-[#6B7280] hover:text-[#1F2937]"
          }`}
        >
          Most Used
        </button>
        <Link
          href="/admin/missing-info-requests"
          className={`text-[13px] font-semibold pb-1 transition-colors ${
            activeTab === "outstanding"
              ? "text-[#0B96D6] border-b-2 border-[#0B96D6]"
              : "text-[#6B7280] hover:text-[#1F2937]"
          }`}
        >
          Outstanding Requests
        </Link>
        <div className="flex-1" />
        <Link
          href="/admin/missing-info-requests"
          className="inline-flex items-center gap-1.5 border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors"
        >
          View Outstanding Requests
        </Link>
        <button
          onClick={handleNewTemplate}
          className="inline-flex items-center gap-1.5 bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors"
        >
          + New Template
        </button>
      </div>

      <div className="px-7 py-4 flex flex-col gap-4">
        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-[#6B7280] font-semibold mr-1">Category:</span>
          <button
            onClick={() => setActiveCategory(undefined)}
            className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
              !activeCategory
                ? "bg-[#0B96D6] text-white"
                : "bg-white text-[#1F2937] border border-[#E5E9EF] hover:border-[#0B96D6]"
            }`}
          >
            All
          </button>
          {["identity", "work_rights", "references", "certifications", "banking"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
              className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                activeCategory === cat
                  ? "bg-[#0B96D6] text-white"
                  : "bg-white text-[#1F2937] border border-[#E5E9EF] hover:border-[#0B96D6]"
              }`}
            >
              {cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Content area */}
        {loading ? (
          <div className="flex items-center justify-center bg-white p-6 h-[40vh]">
            <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-[40vh]">
            <p className="text-gray-400 text-sm">Failed to load templates. Try refreshing.</p>
          </div>
        ) : !hasAnyTemplates ? (
          <EmptyState onNewTemplate={handleNewTemplate} />
        ) : filteredTemplates.length === 0 ? (
          <div className="flex items-center justify-center h-[40vh]">
            <p className="text-gray-400 text-sm">No templates match this filter. Try a different category or status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={setDeleteConfirm}
                onPublish={handlePublish}
                onSend={handleSend}
              />
            ))}
            <button
              onClick={handleNewTemplate}
              className="border-2 border-dashed border-[#0B96D6] rounded-xl bg-[#EAF6FF] flex flex-col items-center justify-center gap-1.5 p-8 text-[#0B96D6] hover:bg-[#d6eefc] transition-colors min-h-[200px]"
            >
              <span className="text-[24px] font-bold leading-none">+</span>
              <span className="text-sm font-bold mt-1">New Template</span>
              <span className="text-[11px] font-normal text-[#6B7280]">Drag-and-drop builder</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Send request modal */}
      {sendModalTemplate && (
        <SendMissingInfoRequestModal
          open
          onClose={() => setSendModalTemplate(null)}
          template={sendModalTemplate}
          clients={clients}
          onSend={handleSendRequest}
          isSending={isSending}
        />
      )}
    </div>
  );
}
