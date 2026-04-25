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
import { UseMutationResult, useQueryClient } from "@tanstack/react-query";
import EditTableModal from "./EditActionModal";
import { UsersTableColType } from "@/types/admin";
import toast from "react-hot-toast";
import { IoDocument } from "react-icons/io5";
import { ImProfile } from "react-icons/im";
import { EmojiTransportationOutlined } from "@mui/icons-material";
import { useApproveDocument, useRejectDocument, useApproveUserAccount, useDeleteUser, useSendSlackSample, useGetUserPendingDocuments, useSoftDeleteUser, useRestoreUser, usePurgeUser } from "../hooks/users-all";

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
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const toastIdRef = useRef<string | null>(null);

  /* ---- Mutations & Queries ---- */
  const approveDocument = useApproveDocument();
  const rejectDocument = useRejectDocument();
  const approveUserAccount = useApproveUserAccount();
  const deleteUser = useDeleteUser();
  const sendSlackSample = useSendSlackSample();
  const softDeleteUser = useSoftDeleteUser();
  const restoreUser = useRestoreUser();
  const purgeUser = usePurgeUser();
  
  const pendingDocuments = useGetUserPendingDocuments(user.id, {
    enabled: activeDialog === "accept-documents" || activeDialog === "reject-documents"
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
            onClick={() => navigator.clipboard.writeText(user.id)}
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
                    onClick={() => window.open(`/admin/users/${user.id}`, '_blank')}
                    key="view-documents"
                  >
                    <IoDocument/>
                    <span>View Documents</span>
                  </DropdownMenuItem>
                );
              case "view-profile":
                return (
                  <DropdownMenuItem
                    onClick={() => window.open(`/admin/users/${user.id}`, '_blank')}
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
          // editUserAction={() => editUserAction}
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
            <Button variant="secondary" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const toastId = toast.loading("Moving user to recycle bin...");
                softDeleteUser.mutate({ userId: user.id }, {
                  onSuccess: () => {
                    toast.dismiss(toastId);
                    toast.success("User moved to recycle bin successfully");
                    queryClient.invalidateQueries({ queryKey: ["users-all"] });
                    setActiveDialog(null);
                  },
                  onError: () => {
                    toast.dismiss(toastId);
                    toast.error("Failed to move user to recycle bin");
                  }
                });
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
            <Button variant="secondary" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const toastId = toast.loading("Restoring user...");
                restoreUser.mutate({ userId: user.id }, {
                  onSuccess: () => {
                    toast.dismiss(toastId);
                    toast.success("User restored successfully");
                    queryClient.invalidateQueries({ queryKey: ["users-all"] });
                    setActiveDialog(null);
                  },
                  onError: () => {
                    toast.dismiss(toastId);
                    toast.error("Failed to restore user");
                  }
                });
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
              This user will be deleted permanently from our server! This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                const toastId = toast.loading("Permanently deleting user...");
                purgeUser.mutate({ userId: user.id }, {
                  onSuccess: () => {
                    toast.dismiss(toastId);
                    toast.success("User permanently deleted");
                    queryClient.invalidateQueries({ queryKey: ["users-all"] });
                    setActiveDialog(null);
                  },
                  onError: () => {
                    toast.dismiss(toastId);
                    toast.error("Failed to delete user permanently");
                  }
                });
              }}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "accept-documents" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User Documents</DialogTitle>
            <DialogDescription>
              The following pending documents will be approved:
            </DialogDescription>
            
            {pendingDocuments.isLoading && (
              <div className="py-4 text-sm text-gray-500">Loading documents...</div>
            )}
            
            {pendingDocuments.data && (
              <div className="py-4 space-y-2 max-h-[320px] overflow-y-auto">
                {(pendingDocuments.data as any)?.data?.map((doc: any) => (
                  <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${selectedDocuments.has(doc.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-transparent'}`} onClick={() => {
                    const newSelected = new Set(selectedDocuments);
                    if (newSelected.has(doc.id)) {
                      newSelected.delete(doc.id);
                    } else {
                      newSelected.add(doc.id);
                    }
                    setSelectedDocuments(newSelected);
                  }}>
                    <input type="checkbox" checked={selectedDocuments.has(doc.id)} onChange={() => {}} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <IoDocument className={`w-5 h-5 ${selectedDocuments.has(doc.id) ? 'text-blue-600' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      <div className="font-medium">{doc.document.name}</div>
                      <div className="text-sm text-gray-500">{doc.type} - {doc.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => {
              setSelectedDocuments(new Set());
              setActiveDialog(null);
            }}>Cancel</Button>
            <Button
              disabled={selectedDocuments.size === 0}
              onClick={() => {
                const toastId = toast.loading(`Approving ${selectedDocuments.size} document(s)...`);
                
                // Approve each selected document
                Promise.all(
                  Array.from(selectedDocuments).map(docId => 
                    approveDocument.mutateAsync({ documentId: docId })
                  )
                ).then(() => {
                  toast.dismiss(toastId);
                  toast.success(`${selectedDocuments.size} document(s) approved successfully`);
                  setSelectedDocuments(new Set());
                  queryClient.invalidateQueries({ queryKey: ["users-all"] });
                  queryClient.invalidateQueries({ queryKey: ["user-pending-documents"] });
                  setActiveDialog(null);
                }).catch(() => {
                  toast.dismiss(toastId);
                  toast.error("Failed to approve some documents");
                });
              }}
            >
              Approve Selected ({selectedDocuments.size})
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
                const toastId = toast.loading("Approving account...");
                approveUserAccount.mutate({ userId: user.id }, {
                  onSuccess: () => {
                    toast.dismiss(toastId);
                    toast.success("Account approved successfully");
                    queryClient.invalidateQueries({ queryKey: ["users-all"] });
                  },
                  onError: () => {
                    toast.dismiss(toastId);
                    toast.error("Failed to approve account");
                  }
                });
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
            <DialogTitle>Reject User Documents</DialogTitle>
            <DialogDescription>
              The following pending documents will be rejected:
            </DialogDescription>
            
            {pendingDocuments.isLoading && (
              <div className="py-4 text-sm text-gray-500">Loading documents...</div>
            )}
            
            {pendingDocuments.data && (
              <div className="py-4 space-y-2 max-h-[320px] overflow-y-auto">
                {(pendingDocuments.data as any)?.data?.map((doc: any) => (
                  <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${selectedDocuments.has(doc.id) ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-transparent'}`} onClick={() => {
                    const newSelected = new Set(selectedDocuments);
                    if (newSelected.has(doc.id)) {
                      newSelected.delete(doc.id);
                    } else {
                      newSelected.add(doc.id);
                    }
                    setSelectedDocuments(newSelected);
                  }}>
                    <input type="checkbox" checked={selectedDocuments.has(doc.id)} onChange={() => {}} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                    <IoDocument className={`w-5 h-5 ${selectedDocuments.has(doc.id) ? 'text-red-600' : 'text-red-500'}`} />
                    <div className="flex-1">
                      <div className="font-medium">{doc.document.name}</div>
                      <div className="text-sm text-gray-500">{doc.type} - {doc.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => {
              setSelectedDocuments(new Set());
              setActiveDialog(null);
            }}>Cancel</Button>
            <Button variant="destructive"
              disabled={selectedDocuments.size === 0}
              onClick={() => {
                const toastId = toast.loading(`Rejecting ${selectedDocuments.size} document(s)...`);
                
                // Reject each selected document
                Promise.all(
                  Array.from(selectedDocuments).map(docId => 
                    rejectDocument.mutateAsync({ documentId: docId })
                  )
                ).then(() => {
                  toast.dismiss(toastId);
                  toast.success(`${selectedDocuments.size} document(s) rejected successfully`);
                  setSelectedDocuments(new Set());
                  queryClient.invalidateQueries({ queryKey: ["users-all"] });
                  queryClient.invalidateQueries({ queryKey: ["user-pending-documents"] });
                  setActiveDialog(null);
                }).catch(() => {
                  toast.dismiss(toastId);
                  toast.error("Failed to reject some documents");
                });
              }}
            >
              Reject Selected ({selectedDocuments.size})
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
                const toastId = toast.loading("Dispatching sample...");
                sendSlackSample.mutate({ userId: user.id }, {
                  onSuccess: () => {
                    toast.dismiss(toastId);
                    toast.success("Sample dispatched successfully");
                  },
                  onError: () => {
                    toast.dismiss(toastId);
                    toast.error("Failed to dispatch sample");
                  }
                });
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