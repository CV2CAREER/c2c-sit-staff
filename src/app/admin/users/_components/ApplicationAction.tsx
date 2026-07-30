"use client"
import { useState } from "react";
import { useParams } from "next/navigation";
import { HiOutlineLightningBolt, HiOutlinePlay, HiOutlineFlag, HiOutlineMail } from "react-icons/hi";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { useAdminUserDetailContext } from "../context/userDetailContext";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TriggerApplicationAction = () => {
  const { user: userContext } = useAdminUserDetailContext();
  // The context stores the raw API payload ({ user: {...} }), not the flat
  // user record — unwrap it the same way onboarding-progress.tsx does.
  const user = (userContext as any)?.user ?? userContext;
  const { id: userId } = useParams<{ id: string }>();
  const { applicationEmailMutation } = useAdminMutations();
  const [confirmType, setConfirmType] = useState<"START" | "END" | null>(null);

  const isPending = applicationEmailMutation.isPending;

  const handleConfirm = () => {
    if (!confirmType || !userId) return;
    applicationEmailMutation.mutate(
      {
        type: confirmType === "START" ? "ADMIN-APPLICATION-START" : "ADMIN-APPLICATION-END",
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email ?? "",
        userId,
      },
      { onSettled: () => setConfirmType(null) }
    );
  };

  return (
    <>
      <div className="relative h-full overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <div className="flex h-full flex-col justify-center p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HiOutlineLightningBolt size={20} />
            </span>
            <h2 className="text-lg font-medium">Trigger Application Action</h2>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setConfirmType("START")}
              disabled={isPending}
              className="gap-2 w-full"
            >
              {isPending && confirmType === "START" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <HiOutlinePlay className="w-4 h-4" />
              )}
              Commence Application
            </Button>
            <Button
              onClick={() => setConfirmType("END")}
              disabled={isPending}
              className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending && confirmType === "END" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <HiOutlineFlag className="w-4 h-4" />
              )}
              End Application
            </Button>
          </div>
        </div>
      </div>

      <AppModal
        isOpen={confirmType !== null}
        onClose={() => setConfirmType(null)}
        closeOnOutsideClick={!isPending}
        contentClassName="max-w-sm w-full !p-0 [&_.lucide-x]:text-white/80 [&_.lucide-x:hover]:text-white"
      >
        <div
          className={`relative overflow-hidden px-8 pt-9 pb-8 text-center ${
            confirmType === "END"
              ? "bg-gradient-to-b from-emerald-500 to-emerald-600"
              : "bg-gradient-to-b from-sky-400 to-primary"
          }`}
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-white/10" />

          <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
            {confirmType === "START" ? (
              <HiOutlinePlay size={26} />
            ) : (
              <HiOutlineFlag size={26} />
            )}
          </span>

          <h2 className="relative mt-4 text-xl font-semibold text-white">
            {confirmType === "START" ? "Start Application?" : "End Application?"}
          </h2>
          <p className="relative mt-1.5 text-sm text-white/80 max-w-[260px] mx-auto leading-relaxed">
            {confirmType === "START"
              ? "This kicks off the application process and notifies the client."
              : "This closes out the current application cycle and notifies the client."}
          </p>
        </div>

        <div className="px-6 pt-5 pb-6">
          <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 mb-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-primary shadow-sm ring-1 ring-sky-100">
              {(user?.firstName?.[0] ?? "").toUpperCase()}
              {(user?.lastName?.[0] ?? "").toUpperCase()}
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-sky-700/70">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-6">
            <HiOutlineMail className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <p className="text-xs text-gray-500 leading-relaxed">
              They&apos;ll receive an email letting them know their application has{" "}
              {confirmType === "START" ? "commenced" : "ended"}.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmType(null)}
              disabled={isPending}
              className="flex-1 border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className={`flex-1 gap-2 ${confirmType === "END" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmType === "START" ? "Yes, Start" : "Yes, End"}
            </Button>
          </div>
        </div>
      </AppModal>
    </>
  );
};

export default TriggerApplicationAction;
