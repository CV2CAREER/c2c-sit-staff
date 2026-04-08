"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { useJobAppsAndQuestionsData } from "./context";

export function JobPrefDataTableActionDialogs({ appOrQuestionId }: { appOrQuestionId: string | number }) {
  const {
    activeDialog,
    setActiveDialog,
    tracker,
  } = useJobAppsAndQuestionsData();

  const close = () => setActiveDialog(null);

  return (
    <>
      <Dialog open={activeDialog === "soft-delete"} onOpenChange={close}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This application will be moved to the recycle bin.</DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={() => { tracker.softDeleteApplication.mutate({ id: appOrQuestionId }); close(); }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "restore"} onOpenChange={close}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This application will be restored to active data.</DialogDescription>
          <DialogFooter>
            <Button onClick={() => { tracker.restoreApplication.mutate({ id: appOrQuestionId }); close(); }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "delete"} onOpenChange={close}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This application will be deleted permanently.</DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={() => { tracker.deleteApplication.mutate({ id: appOrQuestionId }); close(); }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
