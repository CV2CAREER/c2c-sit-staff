/* eslint-disable */
"use client";
import { useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { EditCampaignClientModal } from "./EditModal";
import { CampaignTableColType } from "@/types/admin";
import { useAdminMutations } from "@/hooks/api/admin.api";
import toast from "react-hot-toast";
import { Password } from "@mui/icons-material";

interface CampaignActionsProps {
  client: CampaignTableColType;
  actions: ["edit", "soft-delete", "generate-password"] | ["restore", "delete"] | ["edit", "soft-delete", "generateAQ"];
  rowsData: any;
  setRowsData: (data: any) => void;
}

export function CampaignTableActions({
  client,
  actions,
  rowsData,
  setRowsData,
}: CampaignActionsProps) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<
    "edit" | "soft-delete" | "restore" | "delete" | "generateAQ" | null
  >(null);

  const {
    updateCampaignMutation,
    deleteCampaignMutation,
    restoreCampaignMutation,
    permanentDeleteCampaignMutation,
    generatePasswordMutation,
  } = useAdminMutations();

  const handleEditClient = (clientId: number, updatedData: Partial<CampaignTableColType>) => {
    toast.loading("Updating client...");
    updateCampaignMutation.mutate(
      { clientId: String(clientId), data: updatedData },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Client has been updated successfully");
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Could not update client");
        },
      }
    );
  };

  const handleSoftDelete = (clientId: number) => {
    toast.loading("Moving client to the Recycle bin...");
    deleteCampaignMutation.mutate(
      { id: clientId },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Client has been moved to the Recycle bin");
          queryClient.invalidateQueries({ queryKey: ["admin-fetch-campaign-clients"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Could not move client to the Recycle bin");
        },
      }
    );
  };

  const handleRestore = (clientId: number) => {
    toast.loading("Restoring client...");
    restoreCampaignMutation.mutate(
      { id: clientId },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Client has been restored to active campaign table");
          queryClient.invalidateQueries({ queryKey: ["admin-fetch-campaign-clients"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Could not restore client");
        },
      }
    );
  };

  const handleDeletePermanent = (clientId: number) => {
    toast.loading("Deleting client permanently...");
    permanentDeleteCampaignMutation.mutate(
      { id: clientId },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Client has been delete permanently.");
          queryClient.invalidateQueries({ queryKey: ["admin-fetch-campaign-clients"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Could not delete client.");
        },
      }
    );
  };

  function generatePassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '$' ;
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async function handleGeneratePassword(id: number) {
    toast.loading('Generating password...');
    const password = generatePassword();

    generatePasswordMutation.mutate(
      { userId: String(id)},
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success('Password generated successfully');
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: (err: any) => {
          toast.dismiss();
          toast.error(err.message || 'Failed to generate password');
        }
      }
    );
  }

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
            onClick={() => navigator.clipboard.writeText(String(client.id))}
          >
            Copy Client ID
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
                    <span>Edit Client</span>
                  </DropdownMenuItem>
                );
              case "generate-password":
                return (
                  <DropdownMenuItem
                    disabled = {!!client.ExternalPassword}
                    onClick={() => {
                      handleGeneratePassword(client.id);
                    }}
                    key="generate-password"
                  >
                    <Password />
                    <span>Generate Password</span>
                  </DropdownMenuItem>
                )
              case "soft-delete":
                return (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setActiveDialog("soft-delete")}
                    key="soft-delete"
                  >
                    <Trash2 />
                    <span>Delete Client</span>
                  </DropdownMenuItem>
                );
              case "restore":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("restore")}
                    key="restore"
                  >
                    <RotateCcw />
                    <span>Restore Client</span>
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
                    <span>Delete Client</span>
                  </DropdownMenuItem>
                );
              // case "generateAQ":
              //   return (
              //     <DropdownMenuItem
              //       onClick={() => setActiveDialog("generateAQ")}
              //       key="generateAQ"
              //     >
              //       <UserPen />
              //       <span>Generate AQ</span>
              //     </DropdownMenuItem>
              //   );
              
              default:
                return null;
            }
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeDialog === "edit" && (
        <EditCampaignClientModal
          client={client}
          setDialog={setActiveDialog}
          editClientAction={() => updateCampaignMutation}
        />
      )}

      {activeDialog === "soft-delete" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This client will be moved to the Recycle bin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                handleSoftDelete(client.id);
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
              This client will be restored to the active campaign table.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                handleRestore(client.id);
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
              This client will be deleted permanently from our server!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                handleDeletePermanent(client.id);
                setActiveDialog(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
