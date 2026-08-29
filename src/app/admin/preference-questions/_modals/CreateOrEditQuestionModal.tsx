"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PreferenceQuestion,
  PreferenceQuestionFieldType,
  PreferenceQuestionVisibility,
} from "@/hooks/api/preference-question.api";

const FIELD_TYPE_OPTIONS: { value: PreferenceQuestionFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text (textarea)" },
  { value: "select", label: "Dropdown (select)" },
  { value: "radio", label: "Radio buttons" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Yes / No (checkbox)" },
];

const OPTION_FIELD_TYPES: PreferenceQuestionFieldType[] = ["select", "radio"];

type FormValues = {
  label: string;
  fieldType: PreferenceQuestionFieldType;
  options: string[];
  visibility: PreferenceQuestionVisibility;
  isActive: boolean;
};

const freshValues = (): FormValues => ({
  label: "",
  fieldType: "text",
  options: [],
  visibility: "public",
  isActive: true,
});

interface CreateOrEditQuestionModalProps {
  open: boolean;
  onClose: () => void;
  question: PreferenceQuestion | null;
  onSave: (values: FormValues) => Promise<void>;
  isSaving: boolean;
}

export function CreateOrEditQuestionModal({
  open,
  onClose,
  question,
  onSave,
  isSaving,
}: CreateOrEditQuestionModalProps) {
  const [formValues, setFormValues] = useState<FormValues>(freshValues());
  const [newOption, setNewOption] = useState("");

  const isEditing = !!question;
  const isSystem = !!question?.isSystem;

  useEffect(() => {
    if (!open) return;
    if (question) {
      setFormValues({
        label: question.label,
        fieldType: question.fieldType,
        options: question.options ?? [],
        visibility: question.visibility,
        isActive: question.isActive,
      });
    } else {
      setFormValues(freshValues());
    }
    setNewOption("");
  }, [open, question]);

  const needsOptions = OPTION_FIELD_TYPES.includes(formValues.fieldType);

  const handleAddOption = () => {
    const value = newOption.trim();
    if (!value) return;
    setFormValues((prev) =>
      prev.options.includes(value) ? prev : { ...prev, options: [...prev.options, value] },
    );
    setNewOption("");
  };

  const handleRemoveOption = (value: string) => {
    setFormValues((prev) => ({ ...prev, options: prev.options.filter((o) => o !== value) }));
  };

  const handleSave = async () => {
    if (!formValues.label.trim()) {
      toast.error("Question label is required.");
      return;
    }
    if (needsOptions && formValues.options.length === 0) {
      toast.error("Add at least one option for this field type.");
      return;
    }
    await onSave(formValues);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Question" : "Create Question"}</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            This question will appear on the client&apos;s Preference Questions step exactly as
            configured here.
          </p>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {isSystem && (
            <p className="text-xs text-indigo-700 bg-indigo-50 rounded-md px-3 py-2">
              This question is bound to a dedicated profile field. You can change its label,
              visibility, and active state — field type and options are fixed.
            </p>
          )}

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Question label <span className="text-red-500">*</span>
            </label>
            <Input
              value={formValues.label}
              onChange={(e) => setFormValues((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="e.g. What is your religion or belief?"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">Field type</label>
              <Select
                value={formValues.fieldType}
                disabled={isSystem}
                onValueChange={(value) =>
                  setFormValues((prev) => ({
                    ...prev,
                    fieldType: value as PreferenceQuestionFieldType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a field type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">Visibility</label>
              <div className="flex items-center gap-2 h-10">
                <span className={`text-sm ${formValues.visibility === "public" ? "font-semibold text-gray-900" : "text-gray-400"}`}>
                  Public
                </span>
                <Switch
                  checked={formValues.visibility === "private"}
                  onCheckedChange={(checked) =>
                    setFormValues((prev) => ({ ...prev, visibility: checked ? "private" : "public" }))
                  }
                />
                <span className={`text-sm ${formValues.visibility === "private" ? "font-semibold text-gray-900" : "text-gray-400"}`}>
                  Private
                </span>
              </div>
            </div>
          </div>

          {needsOptions && (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Options {!isSystem && <span className="text-red-500">*</span>}
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-md border border-dashed border-gray-300 bg-gray-50">
                {formValues.options.map((opt) => (
                  <span
                    key={opt}
                    className="group inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs bg-white border border-gray-300 text-gray-700"
                  >
                    {opt}
                    {!isSystem && (
                      <button
                        type="button"
                        title="Remove this option"
                        onClick={() => handleRemoveOption(opt)}
                        className="p-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </span>
                ))}
                {!isSystem && (
                  <div className="flex items-center gap-1">
                    <input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="Add option"
                      className="w-32 text-xs px-2 py-1 rounded-full border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      title="Add option"
                      onClick={handleAddOption}
                      className="p-1 rounded-full text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-700">Active</p>
              <p className="text-xs text-gray-400">Inactive questions are hidden from clients without deleting them.</p>
            </div>
            <Switch
              checked={formValues.isActive}
              onCheckedChange={(checked) => setFormValues((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
