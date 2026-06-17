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
import toast from "react-hot-toast";
import Icon from "../../../../../public/icons";

import MutateAccountModal from "@/components/ActionModal/MutateAccountModal";
import { useQueryClient } from "@tanstack/react-query";
import {
  useApproveDocument,
  useGetUserPendingDocuments,
  useRejectDocument,
  useSoftDeleteUser,
} from "../hooks/users-all";

// ==================== TYPES ====================

type ActionType =
  | "edit"
  | "soft-delete"
  | "accept-documents"
  | "dispatch-sample-result"
  | "reject-documents"
  | "view-documents"
  | "view-profile"
  | "approve-account"
  | "delete";

// ==================== ACTION CONFIG ====================

const furtherAccountOptions = [
  {
    key: "accept-account",
    label: "Accept Account",
    action: "account-mutate" as const,
    actionText: "accept this account",
    modalButtonText: "Accept",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "suspend-account",
    label: "Suspend Account",
    action: "account-mutate" as const,
    actionText: "suspend this account",
    modalButtonText: "Suspend",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "restrict-account",
    label: "Restrict Account",
    action: "account-mutate" as const,
    actionText: "restrict this account",
    modalButtonText: "Restrict",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "dispatch-sample-results",
    label: "Dispatch Sample Results",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "accept-documents",
    label: "Accept Documents",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "reject-documents",
    label: "Reject Documents",
    className: "text-red-700 hover:bg-career-blue-200",
  },
  {
    key: "delete-account", // ← This is now Soft Delete
    label: "Delete Account",
    className: "text-red-600 hover:bg-red-50",
  },

  {
    key: "permanent-delete", // ← Separate permanent delete
    label: "Permanently Delete",
    className: "hover:bg-black text-[#B61E1E]",
  },
  {
    key: "assign-referrer",
    label: "Assign Referrer",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "update-referral-numbers",
    label: "Update Referral Numbers",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
  {
    key: "allow-free-before-referral",
    label: "Allow Free Before Referral",
    className: "text-career-gray-200 hover:bg-career-blue-200",
  },
] as const;

type ActionOption = (typeof furtherAccountOptions)[number];

const isDocumentAction = (
  key: ActionOption["key"],
): key is "accept-documents" | "reject-documents" => {
  return key === "accept-documents" || key === "reject-documents";
};

// ==================== CONFIRMATION DIALOG ====================

function ConfirmationDialog({
  title,
  description,
  confirmText,
  variant = "default",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmText: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AppModal
      isOpen={true}
      onClose={onCancel}
      contentClassName="w-[90%] max-w-md"
    >
      <div className="bg-white rounded-lg p-6">
        <h2 className="font-semibold text-xl text-center mb-4">{title}</h2>
        <p className="text-gray-600 text-center mb-8">{description}</p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}

// ==================== DOCUMENT DIALOG ====================

function DocumentsActionDialog({ ...props }: any) {
  const color = props.variant === "approve" ? "blue" : "red";

  return (
    <AppModal
      isOpen={true}
      onClose={props.onCancel}
      contentClassName="w-[90%] max-w-2xl"
    >
      <div className="bg-white rounded-lg p-6">
        <h2 className="font-semibold text-xl mb-2">{props.title}</h2>
        <p className="text-gray-600 mb-6">{props.description}</p>

        {props.pendingDocuments.isLoading && (
          <div className="py-8 text-center text-gray-500">
            Loading documents...
          </div>
        )}

        {props.pendingDocuments.data && (
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {(props.pendingDocuments.data as any)?.data?.map((doc: any) => (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border transition-all ${
                  props.selectedDocuments.has(doc.id)
                    ? `bg-${color}-50 border-${color}-200`
                    : "bg-gray-50 border-transparent hover:bg-gray-100"
                }`}
                onClick={() => {
                  const newSet = new Set(props.selectedDocuments);
                  if (newSet.has(doc.id)) newSet.delete(doc.id);
                  else newSet.add(doc.id);
                  props.setSelectedDocuments(newSet);
                }}
              >
                <input
                  type="checkbox"
                  checked={props.selectedDocuments.has(doc.id)}
                  readOnly
                  className={`h-5 w-5 rounded border-gray-300 text-${color}-600`}
                />
                <div className="flex-1">
                  <div className="font-medium">{doc.document?.name}</div>
                  <div className="text-sm text-gray-500">
                    {doc.type} — {doc.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <Button variant="outline" className="flex-1" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button
            variant={props.variant === "reject" ? "destructive" : "default"}
            className="flex-1"
            disabled={props.selectedDocuments.size === 0}
            onClick={props.onConfirm}
          >
            {props.variant === "approve" ? "Approve" : "Reject"} Selected (
            {props.selectedDocuments.size})
          </Button>
        </div>
      </div>
    </AppModal>
  );
}

// ==================== MAIN COMPONENT ====================

const FurtherUserAccountActions = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<ActionOption["key"] | null>(
    null,
  );
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );
  const [mutateActionText, setMutateActionText] = useState("");
  const [mutateButtonText, setMutateButtonText] = useState("");
  const [activeDialog, setActiveDialog] = useState<ActionType | null>(null);
  const {
    accountActionMutation: acceptMutation,
    permanentDeleteUserMutation: purgeMutation,
  } = useAdminMutations();

  const softDeleteUser = useSoftDeleteUser();

  const approveDocument = useApproveDocument();
  const rejectDocument = useRejectDocument();

  const pendingDocuments = useGetUserPendingDocuments(userId, {
    enabled: activeAction !== null && isDocumentAction(activeAction),
  });

  const handleActionClick = (option: ActionOption) => {
    if (isDocumentAction(option.key)) {
      setActiveAction(option.key);
      setSelectedDocuments(new Set());
      setActiveDialog(option.key as ActionType);
    } else if (["delete-account", "permanent-delete"].includes(option.key)) {
      setActiveAction(option.key);
    } else if (
      option.key === "accept-account" ||
      option.key === "suspend-account" ||
      option.key === "restrict-account"
    ) {
      setMutateActionText(option.actionText!);
      setMutateButtonText(option.modalButtonText!);
      setActiveAction(option.key);
    } else {
      console.log(`Action not implemented yet: ${option.label}`);
    }
  };

  const closeAll = () => {
    setActiveAction(null);
    setSelectedDocuments(new Set());
    setMutateActionText("");
    setMutateButtonText("");
  };

  const handleSoftDelete = () => {
    const toastId = toast.loading("Moving user to recycle bin...");
    softDeleteUser.mutate(
      { userId },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("User moved to recycle bin successfully");
          closeAll();
        },
        onError: () => {
          toast.dismiss(toastId);
          toast.error("Failed to move user to recycle bin");
        },
      },
    );
  };

  const handlePermanentDelete = () => {
    const toastId = toast.loading("Permanently deleting user...");
    purgeMutation.mutate(
      { userId },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("User permanently deleted");
          closeAll();
        },
        onError: () => {
          toast.dismiss(toastId);
          toast.error("Failed to delete user permanently");
        },
      },
    );
  };

  const handleDocumentsAction = async (isApprove: boolean) => {
    const toastId = toast.loading(
      `${isApprove ? "Approving" : "Rejecting"} ${selectedDocuments.size} document(s)...`,
    );
    const mutation = isApprove ? approveDocument : rejectDocument;

    try {
      await Promise.all(
        Array.from(selectedDocuments).map((docId) =>
          mutation.mutateAsync({ documentId: docId }),
        ),
      );
      toast.dismiss(toastId);
      toast.success(
        `${selectedDocuments.size} document(s) ${isApprove ? "approved" : "rejected"} successfully`,
      );

      queryClient.invalidateQueries({ queryKey: ["user-pending-documents"] });
      setSelectedDocuments(new Set());
      setActiveDialog(null);
    } catch {
      toast.dismiss(toastId);
      toast.error(
        `Failed to ${isApprove ? "approve" : "reject"} some documents`,
      );
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
          className="p-0 w-72 rounded-[4px] bg-white h-auto flex flex-col justify-center -ml-12 z-50"
        >
          {furtherAccountOptions.map((option) => (
            <MenuItem
              key={option.key}
              placeholder=""
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              onResize={() => {}}
              onResizeCapture={() => {}}
              onClick={() => handleActionClick(option)}
              className="!p-0"
            >
              <span
                className={`text-left w-full h-full py-3 px-4 block transition-all ease-in-out duration-200 font-medium ${option.className}`}
              >
                {option.label}
              </span>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      {/* Mutate Account Modal - unchanged */}
      {activeAction &&
        ["accept-account", "suspend-account", "restrict-account"].includes(
          activeAction,
        ) && (
          <MutateAccountModal
            open={true}
            onClose={closeAll}
            actionText={mutateActionText}
            action={mutateButtonText}
            userId={userId}
            acceptMutation={acceptMutation}
          />
        )}

      {/* Soft Delete - Main "Delete Account" */}
      {activeAction === "delete-account" && (
        <ConfirmationDialog
          title="Are you sure?"
          description="This user will be moved to the recycle bin."
          confirmText="Delete"
          variant="destructive"
          onConfirm={handleSoftDelete}
          onCancel={closeAll}
        />
      )}

      {/* Permanent Delete */}
      {activeAction === "permanent-delete" && (
        <ConfirmationDialog
          title="Are you sure?"
          description="This user will be deleted permanently from our server! This action cannot be undone."
          confirmText="Permanently Delete"
          variant="destructive"
          onConfirm={handlePermanentDelete}
          onCancel={closeAll}
        />
      )}

      {/* Documents Dialogs */}
      {activeDialog === "accept-documents" && (
        <DocumentsActionDialog
          title="Approve User Documents"
          description="The following pending documents will be approved:"
          variant="approve"
          selectedDocuments={selectedDocuments}
          setSelectedDocuments={setSelectedDocuments}
          pendingDocuments={pendingDocuments}
          onConfirm={() => handleDocumentsAction(true)}
          onCancel={() => setActiveDialog(null)}
        />
      )}

      {activeDialog === "reject-documents" && (
        <DocumentsActionDialog
          title="Reject User Documents"
          description="The following pending documents will be rejected:"
          variant="reject"
          selectedDocuments={selectedDocuments}
          setSelectedDocuments={setSelectedDocuments}
          pendingDocuments={pendingDocuments}
          onConfirm={() => handleDocumentsAction(false)}
          onCancel={() => setActiveDialog(null)}
        />
      )}
    </>
  );
};

export default FurtherUserAccountActions;
