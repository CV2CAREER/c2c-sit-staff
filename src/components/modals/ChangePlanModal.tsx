"use client";
import { useEffect, useMemo, useState } from "react";
import { FiX, FiLoader } from "react-icons/fi";
import toast from "react-hot-toast";
import CustomModal from "@/components/CustomModal/CustomModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFetchData, useMutateData } from "@/hooks/useApi";
import {
  ADMIN_USER_PLAN_SUMMARY,
  ADMIN_USER_PLAN_UPGRADE,
  ADMIN_USER_PLAN_EXTEND,
} from "@/constants/apiEndpoints/admin.endpoint";

interface PlanOption {
  id: string;
  title: string;
}

interface PlanSummary {
  userId: string;
  uniqueId: string | null;
  currentPlan: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
}

interface ChangePlanModalProps {
  visibility: boolean;
  toggleVisibility: (open: boolean) => void;
  user: {
    id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
  } | null;
  planOptions: PlanOption[];
  onSuccess?: () => void;
}

const ADD_DAYS_REASONS = [
  "Referral Confirmed (+30 days)",
  "Goodwill extension",
  "Manual correction",
  "Other",
];

const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  visibility,
  toggleVisibility,
  user,
  planOptions,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"change" | "add-days">("change");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notifyClient, setNotifyClient] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState<number>(30);
  const [addDaysReason, setAddDaysReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");

  const userId = user?.id;
  const userFullName = [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const resetForm = () => {
    setActiveTab("change");
    setSelectedFeatureId("");
    setReason("");
    setNotifyClient(false);
    setDaysToAdd(30);
    setAddDaysReason("");
    setOtherReason("");
  };

  useEffect(() => {
    if (!visibility) resetForm();
  }, [visibility]);

  const summaryQuery = useFetchData<PlanSummary>({
    method: "GET",
    url: userId ? ADMIN_USER_PLAN_SUMMARY(userId) : "",
    queryKey: ["admin-user-plan-summary", userId ?? null],
    enabled: visibility && !!userId,
    forceRefresh: true,
  });

  const summary = summaryQuery.data?.data;
  const daysLeft = summary?.daysLeft ?? null;

  const close = () => {
    toggleVisibility(false);
  };

  const changePlanMutation = useMutateData<any, { userId: string; featureId: string; reason: string; notifyClient: boolean }>({
    method: "PATCH",
    url: (data) => ADMIN_USER_PLAN_UPGRADE(data.userId),
    mutationKey: ["change-plan-modal"],
    onSuccess: (data) => {
      toast.success(data.message || "Plan changed successfully");
      onSuccess?.();
      close();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change plan");
    },
  });

  const extendPlanMutation = useMutateData<any, { userId: string; days: number; reason: string; notifyClient: boolean }>({
    method: "PATCH",
    url: (data) => ADMIN_USER_PLAN_EXTEND(data.userId),
    mutationKey: ["extend-plan-modal"],
    onSuccess: (data) => {
      toast.success(data.message || "Days added successfully");
      onSuccess?.();
      close();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add days");
    },
  });

  const newDaysLeft = useMemo(() => {
    const base = daysLeft ?? 0;
    const add = Number(daysToAdd) || 0;
    return base + add;
  }, [daysLeft, daysToAdd]);

  const canChangePlan = !!selectedFeatureId && reason.trim().length > 0;
  const canAddDays =
    Number(daysToAdd) > 0 &&
    !!addDaysReason &&
    (addDaysReason !== "Other" || otherReason.trim().length > 0);

  if (!user) return null;

  return (
    <CustomModal visibility={visibility} toggleVisibility={toggleVisibility}>
      <div className="relative rounded-2xl bg-white p-6">
        {/* Header */}
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">Change Plan</h2>
          <button
            onClick={close}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{userFullName || "This user"}</span>
          {summary?.uniqueId && ` · ${summary.uniqueId}`}
          {summaryQuery.isLoading ? (
            " · loading plan details…"
          ) : (
            <>
              {" "}
              · currently{" "}
              <span className="font-semibold text-gray-700">
                {summary?.currentPlan ?? "No plan"}
              </span>
              {daysLeft !== null && <> · {daysLeft} days left</>}
            </>
          )}
        </p>

        {/* Tabs */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("change")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "change"
                ? "bg-career-blue-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Change plan
          </button>
          <button
            onClick={() => setActiveTab("add-days")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "add-days"
                ? "bg-career-blue-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Add days
          </button>
        </div>

        {activeTab === "change" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800">New plan</label>
              <Select value={selectedFeatureId} onValueChange={setSelectedFeatureId}>
                <SelectTrigger className="h-11 rounded-lg border-gray-200">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800">
                Why <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="This is the audit trail. One line is enough."
                className="min-h-[80px] resize-y rounded-lg border-gray-200"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Checkbox
                checked={notifyClient}
                onCheckedChange={(checked) => setNotifyClient(checked === true)}
              />
              Tell the client afterwards — informational only
            </label>

            <div className="mt-1 flex items-center gap-3">
              <Button
                disabled={!canChangePlan || changePlanMutation.isPending}
                onClick={() => {
                  if (!userId || !selectedFeatureId) return;
                  changePlanMutation.mutate({
                    userId,
                    featureId: selectedFeatureId,
                    reason: reason.trim(),
                    notifyClient,
                  });
                }}
                className="flex items-center gap-2"
              >
                {changePlanMutation.isPending && <FiLoader className="animate-spin text-base" />}
                Change plan
              </Button>
              {!canChangePlan && (
                <span className="text-xs text-gray-400">Pick a plan and say why</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800">Days to add</label>
              <input
                type="number"
                min={1}
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(Number(e.target.value))}
                className="h-11 rounded-lg border border-gray-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-career-blue-800"
              />
            </div>

            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Sub end date
              </p>
              <p className="text-sm text-gray-600">
                {daysLeft !== null ? `${daysLeft} days left →` : "No active plan →"}{" "}
                <span className="font-bold text-gray-900">{newDaysLeft} DAYS</span>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800">Reason</label>
              <Select
                value={addDaysReason}
                onValueChange={(value) => {
                  setAddDaysReason(value);
                  if (value !== "Other") setOtherReason("");
                }}
              >
                <SelectTrigger className="h-11 rounded-lg border-gray-200">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {ADD_DAYS_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addDaysReason === "Other" && (
                <Textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Say why you're adding these days."
                  className="mt-1 min-h-[70px] resize-y rounded-lg border-gray-200"
                />
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <Checkbox
                checked={notifyClient}
                onCheckedChange={(checked) => setNotifyClient(checked === true)}
              />
              Tell the client afterwards — informational only
            </label>

            <div className="mt-1 flex items-center gap-3">
              <Button
                disabled={!canAddDays || extendPlanMutation.isPending || daysLeft === null}
                onClick={() => {
                  if (!userId) return;
                  extendPlanMutation.mutate({
                    userId,
                    days: Number(daysToAdd),
                    reason: addDaysReason === "Other" ? otherReason.trim() : addDaysReason,
                    notifyClient,
                  });
                }}
                className="flex items-center gap-2"
              >
                {extendPlanMutation.isPending && <FiLoader className="animate-spin text-base" />}
                Add {daysToAdd || 0} days
              </Button>
              {!canAddDays && (
                <span className="text-xs text-gray-400">Pick a plan and say why</span>
              )}
              {daysLeft === null && !summaryQuery.isLoading && (
                <span className="text-xs text-red-400">No active plan to extend</span>
              )}
            </div>
          </div>
        )}
      </div>
    </CustomModal>
  );
};

export default ChangePlanModal;
