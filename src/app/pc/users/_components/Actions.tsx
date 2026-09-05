"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UsersTableColType } from "@/types/admin";
import { EmojiTransportationOutlined } from "@mui/icons-material";
import { UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, RotateCcw, Trash2, UserPen } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImProfile } from "react-icons/im";
import { IoDocument } from "react-icons/io5";
import EditTableModal from "./EditActionModal";

import {
  useApproveDocument,
  useApproveUserAccount,
  useGetUserPendingDocuments,
  usePurgeUser,
  useRejectDocument,
  useRestoreUser,
  useSendSlackSample,
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
  | "restore"
  | "delete";

interface UserActionsProps {
  user: UsersTableColType;
  actions: ActionType[] | ["restore", "delete"];
  editUserAction?: UseMutationResult<
    any,
    Error,
    { userId: string; updatedData: Partial<UsersTableColType> }
  >;
}

// ==================== ACTION CONFIG ====================

const ACTION_CONFIG: Record<
  ActionType,
  { label: string; icon: React.ReactNode; className?: string }
> = {
  edit: { label: "Edit User", icon: <UserPen /> },
  "soft-delete": {
    label: "Delete User",
    icon: <Trash2 />,
    className: "text-red-600",
  },
  "accept-documents": { label: "Accept Documents", icon: <IoDocument /> },
  "approve-account": { label: "Approve Account", icon: <IoDocument /> },
  "reject-documents": { label: "Reject Documents", icon: <IoDocument /> },
  "dispatch-sample-result": {
    label: "Dispatch Sample",
    icon: <EmojiTransportationOutlined />,
  },
  "view-documents": { label: "View Documents", icon: <IoDocument /> },
  "view-profile": { label: "View Profile", icon: <ImProfile /> },
  restore: { label: "Restore User", icon: <RotateCcw /> },
  delete: {
    label: "Delete User",
    icon: <Trash2 />,
    className: "text-red-600",
  },
};

// ==================== SUB COMPONENTS ====================

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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "default"}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DocumentsActionDialog({
  title,
  description,
  variant = "approve",
  selectedDocuments,
  setSelectedDocuments,
  pendingDocuments,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  variant?: "approve" | "reject";
  selectedDocuments: Set<string>;
  setSelectedDocuments: (docs: Set<string>) => void;
  pendingDocuments: any;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const color = variant === "approve" ? "blue" : "red";

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>

        {pendingDocuments.isLoading && (
          <div className="py-4 text-sm text-gray-500">Loading documents...</div>
        )}

        {pendingDocuments.data && (
          <div className="py-4 space-y-2 max-h-[320px] overflow-y-auto">
            {(pendingDocuments.data as any)?.data?.map((doc: any) => (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors border ${
                  selectedDocuments.has(doc.id)
                    ? `bg-${color}-50 border-${color}-200`
                    : "bg-gray-50 border-transparent"
                }`}
                onClick={() => {
                  const newSet = new Set(selectedDocuments);
                  if (newSet.has(doc.id)) newSet.delete(doc.id);
                  else newSet.add(doc.id);
                  setSelectedDocuments(newSet);
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(doc.id)}
                  onChange={() => {}}
                  className={`h-4 w-4 rounded border-gray-300 focus:ring-${color}-500 text-${color}-600`}
                />
                <IoDocument
                  className={`w-5 h-5 ${selectedDocuments.has(doc.id) ? `text-${color}-600` : `text-${color}-500`}`}
                />
                <div className="flex-1">
                  <div className="font-medium">{doc.document.name}</div>
                  <div className="text-sm text-gray-500">
                    {doc.type} - {doc.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogHeader>

      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => {
            setSelectedDocuments(new Set());
            onCancel();
          }}
        >
          Cancel
        </Button>
        <Button
          variant={variant === "reject" ? "destructive" : "default"}
          disabled={selectedDocuments.size === 0}
          onClick={onConfirm}
        >
          {variant === "approve" ? "Approve" : "Reject"} Selected (
          {selectedDocuments.size})
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ==================== MAIN COMPONENT ====================

export default function UsersTableActions({ user, actions }: UserActionsProps) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<ActionType | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  const toastIdRef = useRef<string | null>(null);

  // Hooks
  const approveDocument = useApproveDocument();
  const rejectDocument = useRejectDocument();
  const approveUserAccount = useApproveUserAccount();
  const softDeleteUser = useSoftDeleteUser();
  const restoreUser = useRestoreUser();
  const purgeUser = usePurgeUser();
  const sendSlackSample = useSendSlackSample();

  const pendingDocuments = useGetUserPendingDocuments(user.id, {
    enabled:
      activeDialog === "accept-documents" ||
      activeDialog === "reject-documents",
  });

  // ==================== HANDLERS ====================

  const handleMutation = (
    mutationFn: any,
    successMsg: string,
    errorMsg: string,
    onSuccessExtra?: () => void,
  ) => {
    const toastId = toast.loading("Processing...");
    mutationFn({
      onSuccess: () => {
        toast.dismiss(toastId);
        toast.success(successMsg);
        queryClient.invalidateQueries({ queryKey: ["users-all"] });
        onSuccessExtra?.();
        setActiveDialog(null);
      },
      onError: () => {
        toast.dismiss(toastId);
        toast.error(errorMsg);
      },
    });
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

  // ==================== RENDER ====================

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(user.id)}
          >
            Copy User ID
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {actions.map((action) => {
            const config = ACTION_CONFIG[action];
            if (!config) return null;

            const isExternalLink =
              action === "view-documents" || action === "view-profile";

            return (
              <DropdownMenuItem
                key={action}
                className={config.className}
                onClick={() => {
                  if (isExternalLink) {
                    window.open(`/admin/users/${user.id}`, "_blank");
                  } else {
                    setActiveDialog(action);
                  }
                }}
              >
                {config.icon}
                <span>{config.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <Dialog
        open={activeDialog !== null}
        onOpenChange={() => setActiveDialog(null)}
      >
        {/* Edit Modal */}
        {activeDialog === "edit" && (
          <EditTableModal user={user} setDialog={setActiveDialog} />
        )}

        {/* Simple Confirmation Dialogs */}
        {activeDialog === "soft-delete" && (
          <ConfirmationDialog
            title="Are you sure?"
            description="This user will be moved to the Recycle bin."
            confirmText="Confirm"
            variant="destructive"
            onConfirm={() =>
              handleMutation(
                (opts: any) => softDeleteUser.mutate({ userId: user.id }, opts),
                "User moved to recycle bin successfully",
                "Failed to move user to recycle bin",
              )
            }
            onCancel={() => setActiveDialog(null)}
          />
        )}

        {activeDialog === "restore" && (
          <ConfirmationDialog
            title="Are you sure?"
            description="This user will be restored to the active users table."
            confirmText="Restore"
            onConfirm={() =>
              handleMutation(
                (opts: any) => restoreUser.mutate({ userId: user.id }, opts),
                "User restored successfully",
                "Failed to restore user",
              )
            }
            onCancel={() => setActiveDialog(null)}
          />
        )}

        {activeDialog === "delete" && (
          <ConfirmationDialog
            title="Are you sure?"
            description="This user will be deleted permanently from our server! This action cannot be undone."
            confirmText="Permanently Delete"
            variant="destructive"
            onConfirm={() =>
              handleMutation(
                (opts: any) => purgeUser.mutate({ userId: user.id }, opts),
                "User permanently deleted",
                "Failed to delete user permanently",
              )
            }
            onCancel={() => setActiveDialog(null)}
          />
        )}

        {activeDialog === "approve-account" && (
          <ConfirmationDialog
            title="Are you sure?"
            description={`Approve ${user?.role} account for this user`}
            confirmText="Approve Account"
            onConfirm={() =>
              handleMutation(
                (opts: any) =>
                  approveUserAccount.mutate({ userId: user.id }, opts),
                "Account approved successfully",
                "Failed to approve account",
              )
            }
            onCancel={() => setActiveDialog(null)}
          />
        )}

        {activeDialog === "dispatch-sample-result" && (
          <ConfirmationDialog
            title="Are you sure?"
            description="Sample results for this user will be dispatched"
            confirmText="Dispatch Samples"
            onConfirm={() =>
              handleMutation(
                (opts: any) =>
                  sendSlackSample.mutate({ userId: user.id }, opts),
                "Sample dispatched successfully",
                "Failed to dispatch sample",
              )
            }
            onCancel={() => setActiveDialog(null)}
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
      </Dialog>
    </>
  );
}
