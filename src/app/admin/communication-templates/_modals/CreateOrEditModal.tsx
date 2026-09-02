"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CommunicationTemplate, EmailTemplateType } from "@/hooks/useCommunicationTemplates";
import { RichEmailEditor, RichEmailEditorHandle } from "../_components/RichEmailEditor";
import { EMAIL_SKELETONS } from "../_utils/emailSkeletons";

type FormValues = {
  key: string;
  name: string;
  type: EmailTemplateType;
  body: string;
  variables: string[];
};

const freshValues = (type: EmailTemplateType): FormValues => ({
  key: "",
  name: "",
  type,
  body: EMAIL_SKELETONS[type].body,
  variables: EMAIL_SKELETONS[type].variables,
});

const isUntouchedSkeleton = (body: string) =>
  body === EMAIL_SKELETONS.customer.body || body === EMAIL_SKELETONS.admin.body || body.trim() === "";

interface CreateOrEditModalProps {
  open: boolean;
  onClose: () => void;
  /** Editing this template in place — its `key` is locked once saved. */
  template: CommunicationTemplate | null;
  /**
   * Duplicating this template — seeds name/type/variables/body from it, but
   * NOT its key: the key is the literal filename the backend's sendMail()
   * calls already look up by, so cloning it verbatim would either collide
   * with the original or (if a dev only checks for exact known keys)
   * silently create a template no code path can ever trigger. The admin
   * picks a fresh, real key for the duplicate same as any new template.
   */
  duplicateFrom?: CommunicationTemplate | null;
  onSave: (values: FormValues) => Promise<void>;
  isSaving: boolean;
}

export function CreateOrEditModal({
  open,
  onClose,
  template,
  duplicateFrom,
  onSave,
  isSaving,
}: CreateOrEditModalProps) {
  const [formValues, setFormValues] = useState<FormValues>(freshValues("customer"));
  const [newVariable, setNewVariable] = useState("");
  const editorRef = useRef<RichEmailEditorHandle>(null);

  const isEditing = !!template;
  const isDuplicating = !template && !!duplicateFrom;
  const isFreshTemplate = !template && !duplicateFrom;

  useEffect(() => {
    if (!open) return;
    if (template) {
      setFormValues({
        key: template.key,
        name: template.name,
        type: template.type,
        body: template.body,
        variables: template.variables ?? [],
      });
    } else if (duplicateFrom) {
      setFormValues({
        key: "",
        name: `${duplicateFrom.name} (Copy)`,
        type: duplicateFrom.type,
        body: duplicateFrom.body,
        variables: duplicateFrom.variables ?? [],
      });
    } else {
      setFormValues(freshValues("customer"));
    }
  }, [open, template, duplicateFrom]);

  const handleTypeChange = (type: EmailTemplateType) => {
    setFormValues((prev) => {
      // Swap in the matching starter design + variable set, but only while creating
      // a brand-new template that hasn't been customized yet — never touch real content.
      if (isFreshTemplate && isUntouchedSkeleton(prev.body)) {
        return { ...prev, type, body: EMAIL_SKELETONS[type].body, variables: EMAIL_SKELETONS[type].variables };
      }
      return { ...prev, type };
    });
  };

  const handleInsertVariable = (name: string) => {
    editorRef.current?.insertText(`<%= ${name} %>`);
  };

  const handleAddVariable = () => {
    const name = newVariable.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!name) return;
    setFormValues((prev) =>
      prev.variables.includes(name) ? prev : { ...prev, variables: [...prev.variables, name] },
    );
    setNewVariable("");
  };

  const handleRemoveVariable = (name: string) => {
    setFormValues((prev) => ({ ...prev, variables: prev.variables.filter((v) => v !== name) }));
  };

  const handleSave = async () => {
    if (!formValues.key.trim() || !formValues.name.trim() || !formValues.body.trim()) {
      toast.error("Key, name and body are required.");
      return;
    }
    await onSave(formValues);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[960px] max-h-[92vh] overflow-y-auto p-0">
        {/* No explicit z-index here on purpose — the dialog's own close button (top-right)
            has no z-index either, so DOM order (this renders first) keeps it paintable on
            top; this bar still sits above the normal-flow scrolling content beneath it. */}
        <div className="sticky top-0 bg-white border-b border-primary/15 px-6 pr-12 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditing ? "Edit Email Template" : isDuplicating ? "Duplicate Email Template" : "Create Email Template"}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {isDuplicating
                ? "Starting from a copy of the original's content — give it a name and a new key before saving."
                : "Design the email visually — no HTML knowledge needed. Click a variable below to drop it into the message, or switch to Code view if you need to fine-tune the markup directly."}
            </p>
          </DialogHeader>
        </div>

        <div className="grid gap-5 py-4 px-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formValues.name}
                onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Welcome Email"
              />
              <p className="text-xs text-gray-400">Shown in the template list — plain, descriptive.</p>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">Audience</label>
              <select
                value={formValues.type}
                onChange={(e) => handleTypeChange(e.target.value as EmailTemplateType)}
                className="w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin / internal team</option>
              </select>
              <p className="text-xs text-gray-400">
                {isFreshTemplate
                  ? "Picking a new audience swaps in a matching starter design."
                  : "Who this email is addressed to."}
              </p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Key <span className="text-red-500">*</span>
            </label>
            <Input
              value={formValues.key}
              onChange={(e) => setFormValues((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="welcome-email.ejs"
              disabled={isEditing}
              className="font-mono text-sm max-w-md"
            />
            <p className="text-xs text-gray-400">
              {isEditing
                ? "Locked once created — the backend sends emails by looking up this exact key."
                : "For developers: must exactly match the templateName the backend already sends with, and be unique."}
            </p>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Variables</label>
              {formValues.variables.length === 0 && (
                <span className="text-xs text-gray-400">No variables yet — add one below</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-md border border-dashed border-gray-300 bg-gray-50">
              {formValues.variables.map((name) => (
                <span
                  key={name}
                  className="group inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-mono bg-white border border-gray-300 text-gray-700"
                >
                  <button
                    type="button"
                    title={`Insert <%= ${name} %> at the cursor`}
                    onClick={() => handleInsertVariable(name)}
                    className="hover:text-blue-700"
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    title="Remove this variable"
                    onClick={() => handleRemoveVariable(name)}
                    className="p-0.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariable();
                    }
                  }}
                  placeholder="variableName"
                  className="w-28 text-xs font-mono px-2 py-1 rounded-full border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  title="Add variable"
                  onClick={handleAddVariable}
                  className="p-1 rounded-full text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles size={12} /> Click a chip to insert it where your cursor is in the message below.
            </p>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Email content <span className="text-red-500">*</span>
            </label>
            <RichEmailEditor
              ref={editorRef}
              value={formValues.body}
              onChange={(body) => setFormValues((prev) => ({ ...prev, body }))}
              minHeight={420}
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
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
