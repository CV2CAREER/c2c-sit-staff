"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader/PageHeader";
import {
  QueueStatus,
  SocialVerificationUserSummary,
  useSocialVerificationQueue,
} from "@/hooks/api/social-verification.api";
import UserSocialCard from "./UserSocialCard";

const STATUS_TABS: { value: QueueStatus; label: string }[] = [
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Fully Approved" },
  { value: "all", label: "All" },
];

export default function SocialVerificationQueue() {
  const [status, setStatus] = useState<QueueStatus>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { listDomain, actions } = useSocialVerificationQueue({ q, status, page, limit });

  const items = listDomain.items;

  const totals = useMemo(() => {
    const pending = items.reduce((s, u) => s + u.pendingCount, 0);
    const approved = items.reduce((s, u) => s + u.approvedCount, 0);
    const exempted = items.filter((u) => u.socialVerificationExempt).length;
    return { pending, approved, exempted };
  }, [items]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleApprove = async (rowId: string) => {
    try {
      await actions.approveRow(rowId);
      toast.success("Social handle approved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not approve handle");
    }
  };

  const handleReject = async (rowId: string) => {
    try {
      await actions.rejectRow(rowId);
      toast.success("Social handle rejected — user must resubmit");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not reject handle");
    }
  };

  const handleExempt = async (user: SocialVerificationUserSummary) => {
    try {
      if (user.socialVerificationExempt) {
        await actions.unExemptUser(user.userId);
        toast.success("Exemption removed — user must submit all 7 handles");
      } else {
        await actions.exemptUser(user.userId);
        toast.success("User exempted — Jobsite Credentials unlocked");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not update exemption");
    }
  };

  const totalPages = Math.max(1, Math.ceil(listDomain.total / limit));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Social Verification"
        description="Review Ambassador social handles. Approve, reject, or exempt a user from the gate."
      />

      <div className="bg-white rounded-sm shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={status} onValueChange={(v) => { setStatus(v as QueueStatus); setPage(1); }}>
            <TabsList>
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or email"
                className="pl-8 w-64"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 flex items-center gap-1">
            <ShieldOff className="h-3 w-3" /> {totals.pending} pending row(s) on page
          </span>
          <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> {totals.approved} approved row(s) on page
          </span>
          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">
            {totals.exempted} exempted user(s) on page
          </span>
          <span className="px-2 py-1 rounded bg-gray-50 text-gray-600 ml-auto">
            {listDomain.total} total user(s)
          </span>
        </div>

        {listDomain.isLoading && (
          <div className="py-10 text-center text-sm text-gray-500">Loading queue...</div>
        )}

        {!listDomain.isLoading && items.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            No users match this filter.
          </div>
        )}

        {!listDomain.isLoading && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((user) => (
              <UserSocialCard
                key={user.userId}
                user={user}
                isMutating={actions.isApproving || actions.isRejecting || actions.isExempting}
                onApprove={handleApprove}
                onReject={handleReject}
                onExempt={handleExempt}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
