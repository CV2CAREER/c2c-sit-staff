"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmModal } from "@/app/admin/communication/client-content/_modals/ConfirmModal";
import type {
  FaqArticle,
  FaqAuthorStatus,
  FaqCategory,
  SaveFaqArticlePayload,
} from "@/types/faq.types";

type FormValues = Omit<SaveFaqArticlePayload, "status">;

const freshValues = (categories: FaqCategory[]): FormValues => ({
  question: "",
  answer: "",
  categoryId: categories[0]?.id ?? "",
  botAnswerable: true,
  displayOrder: 0,
});

const toFormValues = (article: FaqArticle): FormValues => ({
  question: article.question,
  answer: article.answer,
  categoryId: article.categoryId,
  botAnswerable: article.botAnswerable,
  displayOrder: article.displayOrder,
});

interface FaqFormModalProps {
  open: boolean;
  onClose: () => void;
  /** `null` creates a new article. */
  article: FaqArticle | null;
  categories: FaqCategory[];
  onSave: (values: FormValues, status: FaqAuthorStatus) => Promise<void>;
  isSaving: boolean;
  /** Prefills the question for a new article (Gap Log → "Write the answer"). */
  initialQuestion?: string;
}

export function FaqFormModal({
  open,
  onClose,
  article,
  categories,
  onSave,
  isSaving,
  initialQuestion,
}: FaqFormModalProps) {
  const [values, setValues] = useState<FormValues>(freshValues(categories));
  const [initial, setInitial] = useState<FormValues>(freshValues(categories));
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = article
      ? toFormValues(article)
      : { ...freshValues(categories), question: initialQuestion ?? "" };
    setValues(start);
    setInitial(start);
    setDiscardConfirmOpen(false);
    // categories only seed the default for a new article; don't reset mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, article, initialQuestion]);

  const isEditing = !!article;
  const isPublished = article?.status === "published";
  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  const canSave = !!values.question.trim() && !!values.answer.trim() && !!values.categoryId;

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const requestClose = () => {
    if (isSaving) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  const handleSave = async (status: FaqAuthorStatus) => {
    if (!canSave) {
      toast.error("Question, answer and category are required.");
      return;
    }
    await onSave(
      { ...values, question: values.question.trim(), answer: values.answer.trim() },
      status,
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? `Edit ${article?.code}` : "New FAQ"}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Every answer here is a public commitment — write only what is true.
            </p>
          </DialogHeader>

          {isPublished && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This article is live. Saving changes takes it offline — off the FAQ page and
              out of the chatbot — until it is approved again in the Review Queue.
            </p>
          )}

          <div className="grid gap-5 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Question <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.question}
                onChange={(e) => set("question", e.target.value)}
                placeholder="What will the client actually type?"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Answer <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={values.answer}
                onChange={(e) => set("answer", e.target.value)}
                placeholder="Only what is true. Every answer here is a public commitment."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={values.categoryId}
                  onValueChange={(value) => set("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  Pick from the list — new categories are added on the Categories tab.
                </p>
              </div>

              <div className="grid gap-1.5 content-start">
                <label className="text-sm font-medium text-gray-700">Display order</label>
                <Input
                  type="number"
                  min={0}
                  value={values.displayOrder}
                  onChange={(e) => set("displayOrder", Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
              <Checkbox
                checked={values.botAnswerable}
                onCheckedChange={(checked) => set("botAnswerable", checked === true)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  The chatbot may answer from this article
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Untick for refunds, billing, visas and complaints. The article stays public
                  on the FAQ page; the chatbot hands the client over to Human Support instead.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="items-center gap-2">
            {isDirty && (
              <span className="mr-auto text-xs text-amber-600">You have unsaved changes.</span>
            )}
            <Button variant="outline" onClick={requestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleSave("draft")}
              disabled={isSaving || !canSave}
            >
              Save draft
            </Button>
            <Button onClick={() => void handleSave("in_review")} disabled={isSaving || !canSave}>
              {isSaving ? "Saving..." : "Send for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onClose();
        }}
        title="Discard your changes?"
        message="Your edits to this FAQ have not been saved. Closing now will lose them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        variant="destructive"
      />
    </>
  );
}
