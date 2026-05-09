"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useJobPreferenceData } from "./context";

export function JobPrefDataTableActionDialogs({ recordId }: { recordId: string | number }) {
  const {
    activeDialog,
    setActiveDialog,
    selectedTable,
    tracker,
  } = useJobPreferenceData();

  return (
    <>
      <Dialog open={activeDialog === "soft-delete"} onOpenChange={() => setActiveDialog(null)}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This record will be moved to the recycle bin.</DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                tracker.softDeleteRecord.mutate({ id: recordId, category: selectedTable.label });
                setActiveDialog(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "restore"} onOpenChange={() => setActiveDialog(null)}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This record will be restored to active data.</DialogDescription>
          <DialogFooter>
            <Button
              onClick={() => {
                tracker.restoreRecord.mutate({ id: recordId, category: selectedTable.label });
                setActiveDialog(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "delete"} onOpenChange={() => setActiveDialog(null)}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This record will be deleted permanently.</DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                tracker.deleteRecord.mutate({ id: recordId, category: selectedTable.label });
                setActiveDialog(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
