"use client"
import { useState } from "react";
import { useParams } from "next/navigation";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { useAdminUserDetailContext } from "../context/userDetailContext";
import AppModal from "@/components/modals/AppModal";
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
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-medium mb-4">Trigger Application Action</h2>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full sm:w-auto">
              <button
                onClick={() => setConfirmType("START")}
                disabled={isPending}
                className="bg-career-blue-400 hover:bg-career-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isPending && confirmType === "START" && <Loader2 className="w-4 h-4 animate-spin" />}
                Application Start
              </button>
              <button
                onClick={() => setConfirmType("END")}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isPending && confirmType === "END" && <Loader2 className="w-4 h-4 animate-spin" />}
                Application End
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppModal
        isOpen={confirmType !== null}
        onClose={() => setConfirmType(null)}
        closeOnOutsideClick={!isPending}
      >
        <div className="px-4 py-6 md:px-8">
          <h2 className="text-xl font-semibold mb-2 text-black">
            {confirmType === "START" ? "Start Application?" : "End Application?"}
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            {confirmType === "START"
              ? `This will commence the application process for ${user?.firstName} ${user?.lastName} and notify them by email.`
              : `This will mark the application as expired for ${user?.firstName} ${user?.lastName} and notify them by email.`}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmType(null)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmType === "START"
                  ? "bg-career-blue-400 hover:bg-career-blue-300"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmType === "START" ? "Yes, Start" : "Yes, End"}
            </button>
          </div>
        </div>
      </AppModal>
    </>
  );
};

export default TriggerApplicationAction;
