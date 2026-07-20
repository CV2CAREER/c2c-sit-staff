"use client"
import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { HiOutlineLightningBolt, HiOutlinePlay, HiOutlineFlag } from "react-icons/hi";
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
      <div className="relative overflow-hidden rounded-2xl border border-career-gray-300/60 bg-white shadow-sm mb-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-career-blue-800 via-career-blue-300 to-career-blue-800" />
        <div className="p-4 md:p-6 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-career-blue-800/10 text-career-blue-800">
              <HiOutlineLightningBolt size={20} />
            </span>
            <h2 className="text-xl font-medium">Trigger Application Action</h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: isPending ? 1 : 1.03 }}
                whileTap={{ scale: isPending ? 1 : 0.97 }}
                onClick={() => setConfirmType("START")}
                disabled={isPending}
                className="bg-gradient-to-r from-career-blue-800 to-career-blue-500 hover:from-career-blue-800 hover:to-career-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-full shadow-md shadow-career-blue-800/20 hover:shadow-lg transition-shadow inline-flex justify-center items-center gap-2 w-full sm:w-auto"
              >
                {isPending && confirmType === "START" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HiOutlinePlay className="w-4 h-4" />
                )}
                Application Start
              </motion.button>
              <motion.button
                whileHover={{ scale: isPending ? 1 : 1.03 }}
                whileTap={{ scale: isPending ? 1 : 0.97 }}
                onClick={() => setConfirmType("END")}
                disabled={isPending}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-600 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-full shadow-md shadow-emerald-600/20 hover:shadow-lg transition-shadow inline-flex justify-center items-center gap-2 w-full sm:w-auto"
              >
                {isPending && confirmType === "END" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HiOutlineFlag className="w-4 h-4" />
                )}
                Application End
              </motion.button>
            </div>
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
            <button
              onClick={() => setConfirmType(null)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: isPending ? 1 : 1.03 }}
              whileTap={{ scale: isPending ? 1 : 0.97 }}
              onClick={handleConfirm}
              disabled={isPending}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmType === "START"
                  ? "bg-gradient-to-r from-career-blue-800 to-career-blue-500"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500"
              }`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmType === "START" ? "Yes, Start" : "Yes, End"}
            </motion.button>
          </div>
        </div>
      </AppModal>
    </>
  );
};

export default TriggerApplicationAction;
