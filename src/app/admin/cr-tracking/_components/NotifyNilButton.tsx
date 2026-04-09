"use client";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useState } from "react";
import { FiLoader } from "react-icons/fi";
import { Owner } from "./modals/options-modal/types";
import {
  useCRTrackingQueries,
  useCRTrackingMutations,
} from "@/hooks/api/admin/cr-tracking";

interface INotifyNilButtonProps {
  fetchAllCR: () => Promise<unknown>;
  params: { row: { id: string; NIL: string } };
  isNILNotified: boolean;
}

const NotifyNilButton: React.FunctionComponent<INotifyNilButtonProps> = ({
  isNILNotified,
  params,
}) => {
  const [isNotifying, setIsNotifying] = useState(false);

  const { eotOwnersDomain } = useCRTrackingQueries({
    fetchEOTOwners: true,
  });

  const { notifyNilMutation } = useCRTrackingMutations();

  const owners = eotOwnersDomain.data as Owner[] | undefined;

  const handleNILTrigger = async (id: string, NIL: string) => {
    setIsNotifying(true);
    try {
      const nilOwner = owners?.find((owner) => owner.name === NIL);
      const slackId = nilOwner?.slackId || "";
      const name = nilOwner?.name || "";
      const email = nilOwner?.email || "";

      if (nilOwner === undefined) {
        toast.error("NIL not found");
        return;
      }

      if (slackId === "") {
        toast.error("Slack ID not found for NIL");
        return;
      }

      if (email === "") {
        toast.error("Email not found for NIL");
        return;
      }

      notifyNilMutation.mutate({
        id,
        slackId,
        name,
        email,
      });
    } catch {
      toast.error("Failed to notify NIL");
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <div className="flex justify-between w-full">
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleNILTrigger(params.row.id, params.row.NIL);
        }}
        className={`my-2 bg-indigo-500 text-white font-sharp-grotesk py-1 px-2 rounded-md text-xs transition duration-300 ease-in-out flex items-center shadow-sm ${
          isNotifying ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-600"
        } disabled:bg-gray-300 disabled:cursor-not-allowed`}
        disabled={isNotifying || isNILNotified}
      >
        {isNotifying ? (
          <FiLoader className="mr-1 animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        )}
        {isNotifying ? "Notifying..." : "Notify NIL"}
      </Button>
    </div>
  );
};

export default NotifyNilButton;
