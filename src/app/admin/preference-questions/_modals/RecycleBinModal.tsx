"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PreferenceQuestion } from "@/hooks/api/preference-question.api";

interface RecycleBinModalProps {
  open: boolean;
  onClose: () => void;
  questions: PreferenceQuestion[];
  loading: boolean;
  onRestore: (id: string) => Promise<void>;
  onHardDelete: (id: string) => Promise<void>;
}

export function RecycleBinModal({
  open,
  onClose,
  questions,
  loading,
  onRestore,
  onHardDelete,
}: RecycleBinModalProps) {
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    setActingId(id);
    try {
      await onRestore(id);
    } finally {
      setActingId(null);
    }
  };

  const handleHardDelete = async (id: string) => {
    setActingId(id);
    try {
      await onHardDelete(id);
    } finally {
      setActingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConfirmingId(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recycle Bin</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 -mt-2">
          Deleted questions land here first. Restore them or delete them permanently.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Recycle bin is empty.</p>
        ) : (
          <div className="grid gap-2.5">
            {questions.map((question) => {
              const isActing = actingId === question.id;
              const isConfirming = confirmingId === question.id;
              return (
                <div
                  key={question.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{question.label}</p>
                    <p className="text-xs text-gray-400">
                      {question.visibility === "public" ? "Public" : "Private"} ·{" "}
                      {question.deletedAt ? new Date(question.deletedAt).toLocaleDateString() : ""}
                    </p>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">Delete forever?</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isActing}
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isActing}
                        onClick={() => void handleHardDelete(question.id)}
                      >
                        {isActing ? "Deleting..." : "Confirm"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        title="Restore"
                        disabled={isActing}
                        className="p-2 text-gray-600 hover:text-primary rounded-full hover:bg-primary/10 disabled:opacity-40 transition-colors"
                        onClick={() => void handleRestore(question.id)}
                      >
                        {isActing ? (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                      </button>
                      <button
                        title="Delete permanently"
                        disabled={isActing}
                        className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-red-50 disabled:opacity-40 transition-colors"
                        onClick={() => setConfirmingId(question.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
