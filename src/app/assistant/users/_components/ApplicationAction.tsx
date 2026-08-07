"use client"
import { useState } from "react";
import { useParams } from "next/navigation";
import { HiOutlineLightningBolt, HiOutlinePlay, HiOutlineFlag } from "react-icons/hi";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { useAdminUserDetailContext } from "../context/userDetailContext";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TriggerApplicationAction = () => {
  const { user } = useAdminUserDetailContext();
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
      >
        <div className="px-8 py-6">
          <h2 className="text-xl font-semibold mb-2 text-black">
            {confirmType === "START" ? "Start Application?" : "End Application?"}
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            {confirmType === "START"
              ? `This will commence the application process for ${user?.firstName} ${user?.lastName} and notify them by email.`
              : `This will mark the application as expired for ${user?.firstName} ${user?.lastName} and notify them by email.`}
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmType(null)}
              disabled={isPending}
              className="border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className={`gap-2 ${confirmType === "END" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
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
