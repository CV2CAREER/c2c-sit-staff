"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CommunicationTemplate, useCommunicationTemplates } from "@/hooks/useCommunicationTemplates";

const missingInfoOptions = [
  { id: "Date_of_birth", label: "Date of birth" },
  { id: "your_address", label: "Your Address" },
  { id: "preferred_personal_pronouns", label: "Preferred Personal Pronouns" },
  { id: "referral_information", label: "Referral Information" },
];

export default function CommunicationTemplatesPage() {
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [recycleBin, setRecycleBin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMissingInfoType, setSelectedMissingInfoType] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [notificationMethod, setNotificationMethod] = useState<"email" | "whatsapp">("email");
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [formValues, setFormValues] = useState({
    templateName: "",
    persona: "",
    subject: "",
    body: "",
  });

  const {
    usersDomain,
    templatesDomain,
    actions,
    backendStatus,
  } = useCommunicationTemplates({ recycleBin });

  const selectedUser = useMemo(
    () => usersDomain.data.find((user) => user._id === selectedUserId),
    [usersDomain.data, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return usersDomain.data;

    return usersDomain.data.filter((user) => {
      const haystack = [
        user.firstName,
        user.middleName,
        user.lastName,
        user.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [usersDomain.data, searchQuery]);

  const selectedInfoLabel = useMemo(() => {
    return missingInfoOptions.find((item) => item.id === selectedMissingInfoType)?.label ?? "";
  }, [selectedMissingInfoType]);

  const filteredTemplates = useMemo(() => {
    const templates = templatesDomain.data;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templates;

    return templates.filter((template) => {
      const haystack = [
        template.templateName,
        template.persona,
        template.subject,
        template.body,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [searchQuery, templatesDomain.data]);

  // Group templates by persona
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, CommunicationTemplate[]> = {};
    filteredTemplates.forEach((template) => {
      const persona = template.persona || "Uncategorized";
      if (!groups[persona]) {
        groups[persona] = [];
      }
      groups[persona].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setFormValues({ templateName: "", persona: "", subject: "", body: "" });
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setFormValues({
      templateName: template.templateName,
      persona: template.persona,
      subject: template.subject,
      body: template.body,
    });
    setTemplateModalOpen(true);
  };

  const openPreviewTemplate = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setPreviewModalOpen(true);
  };

  const saveTemplate = async () => {
    if (
      !formValues.templateName.trim() ||
      !formValues.persona.trim() ||
      !formValues.subject.trim() ||
      !formValues.body.trim()
    ) {
      toast.error("All template fields are required.");
      return;
    }

    try {
      if (editingTemplate?.id) {
        await actions.updateTemplate({
          id: editingTemplate.id,
          ...formValues,
        });
        toast.success("Template updated successfully.");
      } else {
        await actions.createTemplate(formValues);
        toast.success("Template created successfully.");
      }
      setTemplateModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save template.");
    }
  };

  const moveToRecycleBin = async (templateName: string) => {
    try {
      await actions.softDeleteTemplate(templateName);
      toast.success("Template moved to recycle bin.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to move template.");
    }
  };

  const restoreTemplate = async (templateName: string) => {
    try {
      await actions.restoreTemplate(templateName);
      toast.success("Template restored successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to restore template.");
    }
  };

  const duplicateTemplate = async (templateName: string) => {
    try {
      await actions.duplicateTemplate(templateName);
      toast.success("Template duplicated successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to duplicate template.");
    }
  };

  const removeTemplatePermanently = async (templateName: string) => {
    try {
      await actions.deleteTemplate(templateName);
      toast.success("Template deleted permanently.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete template.");
    }
  };

  const sendMissingInfoNotification = async () => {
    if (!selectedUserId || !selectedMissingInfoType || !customUrl.trim()) {
      toast.error("Client, missing info type and URL are required.");
      return;
    }

    try {
      await actions.notifyMissingInfo({
        userId: selectedUserId,
        missingInfoType: selectedMissingInfoType,
        missingInfoUrl: customUrl.trim(),
        mode: notificationMethod,
      });
      toast.success(`${notificationMethod === "email" ? "Email" : "WhatsApp"} notification sent successfully.`);
      setNotifyModalOpen(false);
      setSelectedUserId("");
      setSelectedMissingInfoType("");
      setCustomUrl("");
      setNotificationMethod("email");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send notification.");
    }
  };

  return (
    <section className="mt-6 flex flex-col gap-6">
      <PageHeader
        title="Communication Templates"
        renderJSX={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setNotifyModalOpen(true)}>
              Send Missing Information
            </Button>
            <Button type="button" onClick={openCreateTemplate}>
              Create Template
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Templates Available</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {templatesDomain.data.length}
          </div>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Clients Available</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {usersDomain.total}
          </div>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Backend Status</div>
          <div className="mt-2 text-sm font-medium text-gray-900">
            Users: {backendStatus.usersReady ? "Ready" : "Pending"}
            <br />
            Templates: {backendStatus.templatesReady ? "Ready" : "Pending"}
            <br />
            Notifications: {backendStatus.notificationsReady ? "Ready" : "Pending"}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
            <p className="text-sm text-gray-500">
              Manage templates grouped by persona. Using Express backend.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search templates"
              className="w-full md:min-w-[280px]"
            />
            <Button type="button" variant="outline" onClick={() => setRecycleBin((prev) => !prev)}>
              {recycleBin ? "Show Active" : "Recycle Bin"}
            </Button>
          </div>
        </div>

        {/* Grouped Templates by Persona */}
        <div className="space-y-4">
          {Object.entries(groupedTemplates).map(([persona, templates]) => (
            <div key={persona} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-[#80D7FF] px-4 py-3">
                <h3 className="font-semibold text-gray-900">
                  {persona} <span className="text-gray-600 font-normal">({templates.length})</span>
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{template.templateName}</h4>
                        <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openPreviewTemplate(template)}>
                          Preview
                        </Button>
                        {!recycleBin ? (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => openEditTemplate(template)}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void duplicateTemplate(template.templateName)}>
                              Duplicate
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void moveToRecycleBin(template.templateName)}>
                              Recycle
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => void restoreTemplate(template.templateName)}>
                              Restore
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void removeTemplatePermanently(template.templateName)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!Object.keys(groupedTemplates).length && (
          <div className="py-8 text-center text-sm text-gray-500">
            No matching templates found.
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Update Communication Template" : "Create Communication Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Template Name</label>
              <Input
                value={formValues.templateName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, templateName: event.target.value }))}
                placeholder="Template Name"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Persona</label>
              <Input
                value={formValues.persona}
                onChange={(event) => setFormValues((prev) => ({ ...prev, persona: event.target.value }))}
                placeholder="admin / assistant / client"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <Input
                value={formValues.subject}
                onChange={(event) => setFormValues((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder="Email subject"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Body</label>
              <Textarea
                value={formValues.body}
                onChange={(event) => setFormValues((prev) => ({ ...prev, body: event.target.value }))}
                className="min-h-[220px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveTemplate()} disabled={actions.isMutating}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.templateName ?? "Template Preview"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Persona:</span> {editingTemplate?.persona ?? "-"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Subject:</span> {editingTemplate?.subject ?? "-"}
            </p>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm whitespace-pre-wrap max-h-[340px] overflow-y-auto">
              {editingTemplate?.body ?? "-"}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Missing Info Notification Modal */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Send Missing Information Notification</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Client</label>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select client</option>
                {usersDomain.data.map((user) => (
                  <option key={user._id} value={user._id}>
                    {[user.firstName, user.middleName, user.lastName]
                      .filter(Boolean)
                      .join(" ")}{" "}
                    - {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Missing information type</label>
              <select
                value={selectedMissingInfoType}
                onChange={(event) => setSelectedMissingInfoType(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select missing info</option>
                {missingInfoOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Destination URL</label>
              <Input
                value={customUrl}
                onChange={(event) => setCustomUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Notification Method</label>
              <select
                value={notificationMethod}
                onChange={(event) => setNotificationMethod(event.target.value as "email" | "whatsapp")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Preview</label>
              <Textarea
                readOnly
                value={
                  selectedUser
                    ? `Hello ${selectedUser.firstName ?? "client"}, please complete your ${selectedInfoLabel || "missing information"} using ${customUrl || "[link pending]"}.`
                    : "Select a client and missing information type to preview the notification."
                }
                className="min-h-[120px]"
              />
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Notification uses the Express communication templates endpoint.
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotifyModalOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void sendMissingInfoNotification()} disabled={actions.isMutating}>
              Send {notificationMethod === "email" ? "Email" : "WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
