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
        mode: "email",
      });
      toast.success("Notification sent successfully.");
      setNotifyModalOpen(false);
      setSelectedUserId("");
      setSelectedMissingInfoType("");
      setCustomUrl("");
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
          <div className="text-sm text-gray-500">Backend Readiness</div>
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
              Manage active templates and recycle-bin records using the Express backend.
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

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-[#80D7FF] text-left text-gray-900">
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Persona</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template, index) => (
                <tr
                  key={template.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border-b px-4 py-3">{template.templateName}</td>
                  <td className="border-b px-4 py-3">{template.persona}</td>
                  <td className="border-b px-4 py-3">{template.subject}</td>
                  <td className="border-b px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => openPreviewTemplate(template)}>
                        Preview
                      </Button>
                      {!recycleBin ? (
                        <>
                          <Button type="button" variant="outline" onClick={() => openEditTemplate(template)}>
                            Edit
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void duplicateTemplate(template.templateName)}>
                            Duplicate
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void moveToRecycleBin(template.templateName)}>
                            Recycle
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" variant="outline" onClick={() => void restoreTemplate(template.templateName)}>
                            Restore
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void removeTemplatePermanently(template.templateName)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredTemplates.length ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No matching templates found.
            </div>
          ) : null}
        </div>
      </div>

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
              Notification uses the new Express communication templates endpoint.
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotifyModalOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void sendMissingInfoNotification()} disabled={actions.isMutating}>
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
