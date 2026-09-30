"use client"
import { useState } from "react";
import { HiOutlinePlay, HiOutlineFlag, HiOutlineMail } from "react-icons/hi";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// SPR-21-02-006: this was the standalone "Trigger Action" card at the top of
// the Customer Profile. It now renders a single trigger button (Commence or
// End) that lives inside its own phase section header inside
// AdminClientJourney. User detail comes from the shared user-detail query
// instead of the page context, so the button renders safely on both the
// admin and pc routes (the admin context has no provider on pc).
const TriggerApplicationAction = ({
  action,
  userId,
}: {
  action: "commence" | "end";
  userId: string;
}) => {
  const isStart = action === "commence";
  const [open, setOpen] = useState(false);
  const { applicationEmailMutation } = useAdminMutations();
  const { userDetailDomain } = useAdminQueries({
    userId,
    fetchUserDetail: true,
  });
  const user = (userDetailDomain.data as any)?.user ?? userDetailDomain.data;

  const isPending = applicationEmailMutation.isPending;

  const handleConfirm = () => {
    if (!userId) return;
    applicationEmailMutation.mutate(
      {
        type: isStart ? "ADMIN-APPLICATION-START" : "ADMIN-APPLICATION-END",
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email ?? "",
        userId,
      },
      { onSettled: () => setOpen(false) }
    );
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={isPending}
        title={
          isStart
            ? "Commence Application — starts the application process and notifies the client"
            : "End Application — closes out the application cycle and notifies the client"
        }
        className={`min-w-[100px] shrink-0 gap-1.5 text-xs ${
          isStart ? "" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
        size="sm"
      >
        {isPending && open ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isStart ? (
          <HiOutlinePlay className="w-3.5 h-3.5" />
        ) : (
          <HiOutlineFlag className="w-3.5 h-3.5" />
        )}
        {isStart ? "Commence" : "End"}
      </Button>

      <AppModal
        isOpen={open}
        onClose={() => setOpen(false)}
        closeOnOutsideClick={!isPending}
        contentClassName="max-w-sm w-full !p-0 [&_.lucide-x]:text-white/80 [&_.lucide-x:hover]:text-white"
      >
        <div
          className={`relative overflow-hidden px-8 pt-9 pb-8 text-center ${
            !isStart
              ? "bg-gradient-to-b from-emerald-500 to-emerald-600"
              : "bg-gradient-to-b from-sky-400 to-primary"
          }`}
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-white/10" />

          <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
            {isStart ? (
              <HiOutlinePlay size={26} />
            ) : (
              <HiOutlineFlag size={26} />
            )}
          </span>

          <h2 className="relative mt-4 text-xl font-semibold text-white">
            {isStart ? "Commence Application?" : "End Application?"}
          </h2>
          <p className="relative mt-1.5 text-sm text-white/80 max-w-[260px] mx-auto leading-relaxed">
            {isStart
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
              {isStart ? "commenced" : "ended"}.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="flex-1 border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className={`flex-1 gap-2 ${!isStart ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Yes
            </Button>
          </div>
        </div>
      </AppModal>
    </>
  );
};

export default TriggerApplicationAction;
