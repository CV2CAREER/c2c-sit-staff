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
import { useAdminMutations } from "@/hooks/api/admin.api";
import { CampaignTableColType } from "@/types/admin";
import toast from "react-hot-toast";
import EditRowModal from "@/components/modals/AggregatorModal/AggregatorModal";
import { isArray } from "util";
import convertUtcToBrowserLocalTime from "@/utils/timezone-specific-date-formater";
import { useQueryClient } from "@tanstack/react-query";

interface CampaignActionsProps {
  client: CampaignTableColType;
  actions: ["edit", "soft-delete"] | ["restore", "delete"];
  table: string;
  rowsData: any;
  setRowsData: any;
  columnHeaders: any;
}

export function CampaignClientActions({
  client,
  actions,
  table,
  rowsData,
  setRowsData,
  columnHeaders
}: CampaignActionsProps) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<
   "edit" | "soft-delete" | "restore" | "delete" | null
  >(null);
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);

  const {
    updateCampaignMutation,
    deleteCampaignMutation,
    restoreCampaignMutation,
    updateCampaignSheetSingleMutation,
  } = useAdminMutations();

  const handleSoftDelete = (client: any) => {
    toast.loading("Moving to recycle bin...");
    deleteCampaignMutation.mutate(
      { id: client.id },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Moved to recycle bin");
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Unable to move to recycle bin");
        },
      }
    );
    setActiveDialog(null);
  };

  const handleRestore = (client: any) => {
    toast.loading("Restoring...");
    restoreCampaignMutation.mutate(
      { id: client.id },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Restored successfully");
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Unable to restore record");
        },
      }
    );
    setActiveDialog(null);
  };

  const handleEditRowsModelChange = async (newModel: any, originalModel: any) => {
    let bodyToSend: any = { ...newModel };

    if (table === "seek" || table === "seek_stage") {
      if (bodyToSend.Type_Name) {
        switch (bodyToSend.Type_Name) {
          case 'All Options': bodyToSend.Type = '0'; break;
          case 'Full Time': bodyToSend.Type = '242'; break;
          case 'Part Time': bodyToSend.Type = '243'; break;
          case 'Contract / Temp': bodyToSend.Type = '244'; break;
          case 'Casual / Vacation': bodyToSend.Type = '245'; break;
        }
      }
    }

    if (isArray(bodyToSend.classification) && typeof bodyToSend.classification === 'string') {
      bodyToSend.classification = (bodyToSend.classification as string).split(',');
    }

    toast.loading('Saving changes');
    updateCampaignSheetSingleMutation.mutate(
      { table, id: newModel.id, data: bodyToSend },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success('Changes saved successfully');
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: () => {
          toast.dismiss();
          toast.error("Failed to save changes");
        }
      }
    );
  };

  /* ---- Render ---- */
  return (
    <>
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
            onClick={() => {
              navigator.clipboard.writeText(String(client.id))
              toast.success("Copied")
            }}
          >
            Copy ID
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {actions.map((action) => {
            switch (action) {
              case "edit":
                return (
                  
                  <DropdownMenuItem
                    onClick={() => {
                      setIsEditRowModalOpen(true);
                      setSelectedRowData(client);
                    }}
                    key="edit"
                  >

                    <UserPen />
                    <span>Edit Client</span>
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
                    <span>Delete</span>
                  </DropdownMenuItem>
                );

              case "restore":
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("restore")}
                    key="restore"
                  >
                    <RotateCcw />
                    <span>Restore</span>
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
                    <span>Delete</span>
                  </DropdownMenuItem>
                );

              default:
                return null;
            }
          })}
        </DropdownMenuContent>
      </DropdownMenu>


      {activeDialog === "soft-delete" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This record will be moved to the Recycle bin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleSoftDelete(client)}
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
              This record will be restored to the active campaign table.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => handleRestore(client)}
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
              This record will be deleted permanently from our server!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                // deleteClientAction.mutate(client.id);
                setActiveDialog(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter> 
        </DialogContent>
      )}
    </Dialog>
    {isEditRowModalOpen && selectedRowData && (
       <EditRowModal
          visible={isEditRowModalOpen}
          onClose={() => setIsEditRowModalOpen(false)}
          rowData={selectedRowData}
          table={table}
          columnHeaders={columnHeaders}
          handleEditRowsModelChange={handleEditRowsModelChange}
          onRowClick={undefined}     
        />
    )}
  </>
);
}
