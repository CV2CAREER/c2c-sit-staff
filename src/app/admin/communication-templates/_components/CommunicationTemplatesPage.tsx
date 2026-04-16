"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCommunicationTemplates } from "@/hooks/useCommunicationTemplates";

const missingInfoOptions = [
  { id: "Date_of_birth", label: "Date of birth" },
  { id: "your_address", label: "Your Address" },
  { id: "preferred_personal_pronouns", label: "Preferred Personal Pronouns" },
  { id: "referral_information", label: "Referral Information" },
];

export default function CommunicationTemplatesPage() {
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMissingInfoType, setSelectedMissingInfoType] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const {
    usersDomain,
    templatesDomain,
    backendStatus,
  } = useCommunicationTemplates();

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

  return (
    <section className="mt-6 flex flex-col gap-6">
      <PageHeader
        title="Communication Templates"
        renderJSX={
          <Button
            type="button"
            variant="outline"
            onClick={() => setNotifyModalOpen(true)}
          >
            Send Missing Information Notification
          </Button>
        }
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Backend integration pending</p>
        <p className="mt-1">
          The legacy page is now port-ready, and live client lookup is wired from
          <code> /api/v1/user/all </code>. Template CRUD and notification send actions
          still depend on backend template endpoints that are not available yet.
        </p>
      </div>

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
            <h2 className="text-lg font-semibold text-gray-900">Client Directory</h2>
            <p className="text-sm text-gray-500">
              Live client lookup is ready for the notification workflow.
            </p>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search clients by name or email"
            className="w-full md:max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-[#80D7FF] text-left text-gray-900">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr
                  key={user._id}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border-b px-4 py-3">
                    {[user.firstName, user.middleName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </td>
                  <td className="border-b px-4 py-3">{user.email}</td>
                  <td className="border-b px-4 py-3">{user.phoneNumber || "-"}</td>
                  <td className="border-b px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedUserId(user._id);
                        setNotifyModalOpen(true);
                      }}
                    >
                      Prepare Notification
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filteredUsers.length ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No matching clients found.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Templates Workspace</h2>
        <p className="mt-2 text-sm text-gray-500">
          This section is intentionally staged for backend hookup. The page structure is
          ready, but template listing, edit, duplicate, delete, export, and send actions
          are waiting on the new template endpoints.
        </p>
        <div className="mt-6 rounded-md border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm font-medium text-gray-700">No templates loaded yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Connect the backend template routes and this area can be upgraded in place.
          </p>
        </div>
      </div>

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
              Notification send is not enabled yet because the backend notification endpoints
              are still pending. This modal is here so the workflow can be finished quickly once
              those routes land.
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotifyModalOpen(false)}>
              Close
            </Button>
            <Button type="button" disabled>
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
