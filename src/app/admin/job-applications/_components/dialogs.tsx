"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { useJobAppsAndQuestionsData } from "./context";

export function JobPrefDataTableActionDialogs({ appOrQuestionId }: { appOrQuestionId: string | number }) {
  const {
    activeDialog,
    setActiveDialog,
    activeTable,
    tracker,
    questionsTracker,
  } = useJobAppsAndQuestionsData();

  const isQuestions = activeTable === "Questions";
  const label = isQuestions ? "question" : "application";

  const close = () => setActiveDialog(null);

  const handleSoftDelete = () => {
    if (isQuestions) {
      questionsTracker.softDeleteQuestion.mutate({ id: appOrQuestionId });
    } else {
      tracker.softDeleteApplication.mutate({ id: appOrQuestionId });
    }
    close();
  };

  const handleRestore = () => {
    if (isQuestions) {
      questionsTracker.restoreQuestion.mutate({ id: appOrQuestionId });
    } else {
      tracker.restoreApplication.mutate({ id: appOrQuestionId });
    }
    close();
  };

  const handleDelete = () => {
    if (isQuestions) {
      questionsTracker.deleteQuestion.mutate({ id: appOrQuestionId });
    } else {
      tracker.deleteApplication.mutate({ id: appOrQuestionId });
    }
    close();
  };

  return (
    <>
      <Dialog open={activeDialog === "soft-delete"} onOpenChange={close}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This {label} will be moved to the recycle bin.</DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={handleSoftDelete}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "restore"} onOpenChange={close}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This {label} will be restored to active data.</DialogDescription>
          <DialogFooter>
            <Button onClick={handleRestore}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "delete"} onOpenChange={close}>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This {label} will be deleted permanently.</DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
