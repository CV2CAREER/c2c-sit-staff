"use client";

import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import { useAdminMutations } from "@/hooks/api/admin.api";
import {
    Menu,
    MenuHandler,
    MenuItem,
    MenuList,
} from "@material-tailwind/react";
import { useState } from "react";
import Icon from "../../../../../public/icons";

const furtherAccountOptions = [
  {
    value: "Accept Account",
    className: "text-career-gray-200 hover:bg-career-blue-200",
    action: "account-mutate",
    actionText: "accept this account",
    modalButtonText: "Accept",
    mutateType: "account-mutate",
  },
  {
    value: "Suspend Account",
    className: "text-career-gray-200 hover:bg-career-blue-200",
    action: "account-mutate",
    actionText: "suspend this account",
    modalButtonText: "Suspend",
    mutateType: "account-mutate",
  },
  {
    value: "Restrict Account",
    className: "text-career-gray-200 hover:bg-career-blue-200",
    action: "account-mutate",
    actionText: "restrict this account",
    modalButtonText: "Restrict",
    mutateType: "account-mutate",
  },
  {
    value: "Dispatch Sample Results",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    value: "Accept Documents",
    className: "text-career-gray-200 hover:bg-career-blue-200",
    action: "document-mutate",
    actionText: "accept these documents",
    modalButtonText: "Accept",
    mutateType: "accept-documents",
  },
  {
    value: "Reject Documents",
    className: "text-red-700 hover:bg-career-blue-200",
    action: "document-mutate",
    actionText: "reject these documents",
    modalButtonText: "Reject",
    mutateType: "reject-documents",
  },
  {
    value: "Delete Account",
    className: "hover:bg-black text-[#B61E1E]",
    action: "account-mutate",
    actionText: "delete this account",
    modalButtonText: "Delete",
    mutateType: "account-mutate",
  },
  {
    value: "Assign Referrer",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    value: "Update Referral Numbers",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    value: "Allow Free Before Referral",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
];

const FurtherUserAccountActions = ({ userId }: { userId: string }) => {
  const [isAccountMutateModalOpen, setIsAccountMutateModalOpen] =
    useState(false);
  const [mutateActionText, setMutateActionText] = useState("");
  const [mutateButtonText, setMutateButtonText] = useState("");
  const [mutateButtonStyles, setMutateButtonStyles] = useState("");
  const [mutateType, setMutateType] = useState<string>("");

  const handleMenuItemClick = (option: any) => {
    if (
      option.action === "account-mutate" ||
      option.action === "document-mutate"
    ) {
      setIsAccountMutateModalOpen(true);
      setMutateActionText(option.actionText || "");
      setMutateButtonText(option.modalButtonText || option.value);
      setMutateButtonStyles(option.className || "");
      setMutateType(option.mutateType || "");
    } else {
      console.log(`Action not implemented yet: ${option.value}`);
      // TODO: Handle other actions here in the future
    }
  };

  return (
    <>
      <Menu placement="bottom-end">
        <MenuHandler>
          <button className="bg-career-blue-200 flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-[0.25rem]">
            <Icon name="more" />
          </button>
        </MenuHandler>
        <MenuList
          placeholder=""
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
          onResize={() => {}}
          onResizeCapture={() => {}}
          className="p-0 w-72 rounded-[4px] bg-white h-auto flex flex-col justify-center -ml-12 absolute z-50"
        >
          {furtherAccountOptions.map((option, indx) => (
            <MenuItem
              key={indx}
              placeholder=""
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              onResize={() => {}}
              onResizeCapture={() => {}}
              onClick={() => handleMenuItemClick(option)}
              className="!p-0 z-50"
            >
              <span
                className={`text-left w-full h-full py-3 px-4 block transition-all ease-in-out duration-200 font-medium ${option.className}`}
              >
                {option.value}
              </span>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <MutateAccountModal
        userId={userId}
        open={isAccountMutateModalOpen}
        setIsOpen={setIsAccountMutateModalOpen}
        actionText={mutateActionText}
        action={mutateButtonText}
        affirmButtonStyles={mutateButtonStyles}
        mutateType={mutateType}
      />
    </>
  );
};

export default FurtherUserAccountActions;

// ====================== MODAL ======================

const MutateAccountModal = ({
  open,
  setIsOpen,
  actionText,
  action,
  affirmButtonStyles,
  userId,
  mutateType = "",
}: {
  open: boolean;
  setIsOpen: (open: boolean) => void;
  actionText: string;
  action: string;
  affirmButtonStyles: string;
  userId: string;
  mutateType?: string;
}) => {
  const {
    accountActionMutation: acceptMutation,
    permanentDeleteUserMutation: deleteMutation,
    reviewDocumentMutation, // ← Correct mutation for documents
  } = useAdminMutations();

  const handleConfirm = () => {
    console.log(
      "Confirming action:",
      action,
      "for user:",
      userId,
      "with mutateType:",
      mutateType,
    );
    if (mutateType === "accept-documents") {
      console.log("Accepting documents for user:", userId);
      reviewDocumentMutation.mutate({
        ids: [], // ← IMPORTANT: You need to pass actual document IDs
        status: "approved", // Adjust based on your backend ("accepted" / "approved")
      });
    } else if (mutateType === "reject-documents") {
      console.log("Rejecting documents for user:", userId);
      reviewDocumentMutation.mutate({
        ids: [], // ← IMPORTANT: You need to pass actual document IDs
        status: "rejected",
      });
    } else if (action === "Accept") {
      console.log("Accepting account for user:", userId);
      acceptMutation.mutate({ userId, action: action.toLowerCase() });
    } else if (action === "Delete") {
      console.log("Deleting account for user:", userId);
      deleteMutation.mutate({ userId });
    }

    setIsOpen(false);
  };

  return (
    <AppModal
      isOpen={open}
      onClose={() => setIsOpen(false)}
      contentClassName="w-[200%]"
    >
      <div className="flex justify-center">
        <div className="bg-white rounded-lg w-72 p-6">
          <h2 className="font-semibold text-xl mb-6">
            Are you sure you want to {actionText}?
          </h2>
          <div className="flex justify-between gap-3">
            <Button
              className={`text-white p-2 w-1/2 rounded-lg ${affirmButtonStyles}`}
              onClick={handleConfirm}
            >
              {action}
            </Button>
            <Button
              className="shadow-sm p-2 w-1/2 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </AppModal>
  );
};
