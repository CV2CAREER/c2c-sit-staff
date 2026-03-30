"use client"
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, MoreHorizontal, UserPen } from "lucide-react";
import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import EditTableModal from "./EditActionModal";
import { UsersTableColType } from "@/types/admin";
import toast from "react-hot-toast";
import axios from "axios";
import { IoDocument } from "react-icons/io5";
import { ImProfile } from "react-icons/im";
import { EmojiTransportationOutlined } from "@mui/icons-material";

interface UserActionsProps {
  user: UsersTableColType;
  actions: ["edit", "soft-delete", "accept-documents", "dispatch-sample-result", "reject-documents", "view-documents", "view-profile", "approve-account"] | ["restore", "delete"];
  editUserAction?: UseMutationResult<
    any,
    Error,
    { userId: string; updatedData: Partial<UsersTableColType> }
  >;
}

export default function UsersTableActions({
  user,
  actions,
}: UserActionsProps) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<
    "edit" | "accept-documents" | "approve-account" | "dispatch-sample-result" | "reject-documents" | "view-documents" | "view-profile" | "soft-delete" | "restore" | "delete" | null
  >(null);
  const toastIdRef = useRef<string | null>(null);

  /* ---- Mutations ---- */
  const editUserAction = useMutation({
    mutationFn: ({
      userId,
      updatedData,
    }: {
      userId: string;
      updatedData: Partial<UsersTableColType>;
    }) => {
      toast.loading("Editing user...");
      return axios.patch(`/api/admin/users?id=${userId}`, updatedData);
    },
    onSuccess: () => {
      toast.success("User has been edited successfully");
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
    },
    onError: () => {
      toast.error("Could not edit user");
    },
  });

  const approveUserDocumentAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Approving document...");
      return axios.patch(`/api/admin/users/approve-document?id=${userId}`);
    },
    onSuccess: (data) => {
      const successMessage = data.data.message || "Document approved for user";
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
    },
    onError: (error: any) => {
      const errorMessage = error.response.data?.message || "Could not approve user document";
      toast.error(errorMessage);
    }
  })

  const approveAccountAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Approving account...");
      return axios.patch(`/api/admin/users/approve-account?id=${userId}`);
    },
    onSuccess: (data) => {
      const successMessage = data.data.message || "Account approved for user";
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
    },
    onError: (error: any) => {
      const errorMessage = error.response.data?.message || "Could not approve user document";
      toast.error(errorMessage);
    }
  })

  const rejectUserDocumentAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Rejecting document...");
      return axios.patch(`/api/admin/users/reject-document?id=${userId}`);
    },
    onSuccess: (data) => {
      const successMessage = data.data.message || "Document rejected for user";
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
    },
    onError: (error: any) => {
      const errorMessage = error.response.data?.message || "Could not reject user document";
      toast.error(errorMessage);
    }
  })

  const dispatchUserSampleAction = useMutation({
    mutationFn: (userId: string) => {
      toastIdRef.current = toast.loading("Dispatching Samples");
      return axios.patch(`/api/admin/users/dispatch-sample?id=${userId}`);
    },
    onSuccess: (data) => {
      const successMessage = data.data.message || "Samples dispatched for user";
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.success(successMessage);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Could not dispatch user samples";
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toast.error(errorMessage);
    }
  })

  const softDeleteUserAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Moving to the Recycle bin...");
      return axios.patch(`/api/admin/users?id=${userId}`, {
        isDeleted: true,
      });
    },
    onSuccess: () => {
      toast.success("User has been moved to the Recycle bin");
      queryClient.invalidateQueries({ queryKey: ["users", "recycle"] });
    },
    onError: () => {
      toast.error("Could not move user to the Recycle bin");
    },
  });
  
  const restoreUserAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Restoring user...");
      return axios.patch(`/api/admin/users?id=${userId}`, {
        isDeleted: false,
      });
    },
    onSuccess: () => {
      toast.success("User has been restored to active users table");
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
      queryClient.invalidateQueries({ queryKey: ["users", "recycle"] });
    },
    onError: () => {
      toast.error("Could not restore user");
    },
  });
    
  const deleteUserAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Deleting user permanently...");
      return axios.delete(`/api/admin/users?id=${userId}`);
    },
    onSuccess: () => {
      toast.success("User has been delete permanently.");
      queryClient.invalidateQueries({ queryKey: ["users", "recycle"] });
    },
    onError: () => {
      toast.error("Could not delete user.");
    },
  });
  
  /* ---- Render ---- */
  return (
    <Dialog
      open={activeDialog !== null}
      onOpenChange={() => setActiveDialog(null)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(user._id)}
          >
            Copy User ID
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {actions.map((action) => {
            switch (action) {
              case "edit":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("edit")}
                    key="edit"
                  >
                    <UserPen />
                    <span>Edit User</span>
                  </DropdownMenuItem>
                );
              case "soft-delete":
                return (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setActiveDialog("soft-delete")}
                    key="soft-delete"
                  >
                    <Trash2 />
                    <span>Delete User</span>
                  </DropdownMenuItem>
                );
              case "accept-documents":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("accept-documents")}
                    key="accept-documents"
                  >
                    <IoDocument/>
                    <span>Accept Documents</span>
                  </DropdownMenuItem>
                );
              case "approve-account":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("approve-account")}
                    key="approve-account"
                  >
                    <IoDocument/>
                    <span>Approve Account</span>
                  </DropdownMenuItem>
                );
              case "reject-documents":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("reject-documents")}
                    key="reject-documents"
                  >
                    <IoDocument/>
                    <span>Reject Documents</span>
                  </DropdownMenuItem>
                );
              case "dispatch-sample-result":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("dispatch-sample-result")}
                    key="dispatch-sample-result"
                  >
                    <EmojiTransportationOutlined/>
                    <span>Dispatch Sample</span>
                  </DropdownMenuItem>
                );
              case "view-documents":
                return (
                  <DropdownMenuItem
                    onClick={() => window.open(`/admin/users/${user._id}`, '_blank')}
                    key="view-documents"
                  >
                    <IoDocument/>
                    <span>View Documents</span>
                  </DropdownMenuItem>
                );
              case "view-profile":
                return (
                  <DropdownMenuItem
                    onClick={() => window.open(`/admin/users/${user._id}`, '_blank')}
                    key="view-profile"
                  >
                    <ImProfile/>
                    <span>View Profile</span>
                  </DropdownMenuItem>
                );
              case "restore":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("restore")}
                    key="restore"
                  >
                    <RotateCcw />
                    <span>Restore User</span>
                  </DropdownMenuItem>
                );
              case "delete":
                return (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setActiveDialog("delete")}
                    key="delete"
                  >
                    <Trash2 />
                    <span>Delete User</span>
                  </DropdownMenuItem>
                );
              default:
                return null;
            }
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeDialog === "edit" && (
        <EditTableModal
          user={user}
          setDialog={setActiveDialog}
          editUserAction={() => editUserAction}
        />
      )}

      {activeDialog === "soft-delete" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This user will be moved to the Recycle bin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                softDeleteUserAction.mutate(user._id);
                setActiveDialog(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "restore" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This user will be restored to the active users table.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                restoreUserAction.mutate(user._id);
                setActiveDialog(null);
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "delete" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This user will be deleted permanently from our server!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                deleteUserAction.mutate(user._id);
                setActiveDialog(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "accept-documents" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This user's documents will be approved and verified
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                approveUserDocumentAction.mutate(user._id);
                setActiveDialog(null);
              }}
            >
              Accept Documents
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "approve-account" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Approve {user?.role} account for this user
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                approveAccountAction.mutate(user._id);
                setActiveDialog(null);
              }}
            >
              Approve Account
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "reject-documents" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This user's documents will be rejected and unverfied
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                rejectUserDocumentAction.mutate(user._id);
                setActiveDialog(null);
              }}
            >
              Reject Documents
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "dispatch-sample-result" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Sample results for this user will be dispatched
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                dispatchUserSampleAction.mutate(user.uniqueId);
                setActiveDialog(null);
              }}
            >
              Dispatch Samples
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
