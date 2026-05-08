"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CommunicationTemplate } from "@/hooks/useCommunicationTemplates";

type FormValues = {
  templateName: string;
  persona: string;
  subject: string;
  body: string;
};

interface CreateOrEditModalProps {
  open: boolean;
  onClose: () => void;
  template: CommunicationTemplate | null;
  onSave: (values: FormValues) => Promise<void>;
  isSaving: boolean;
}

export function CreateOrEditModal({
  open,
  onClose,
  template,
  onSave,
  isSaving,
}: CreateOrEditModalProps) {
  const [formValues, setFormValues] = useState<FormValues>({
    templateName: "",
    persona: "",
    subject: "",
    body: "",
  });

  useEffect(() => {
    if (open) {
      setFormValues(
        template
          ? {
              templateName: template.templateName,
              persona: template.persona,
              subject: template.subject,
              body: template.body,
            }
          : { templateName: "", persona: "", subject: "", body: "" },
      );
    }
  }, [open, template]);

  const handleSave = async () => {
    if (
      !formValues.templateName.trim() ||
      !formValues.persona.trim() ||
      !formValues.subject.trim() ||
      !formValues.body.trim()
    ) {
      toast.error("All fields are required.");
      return;
    }
    await onSave(formValues);
  };

  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormValues((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Communication Template" : "Create Communication Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Template Name</label>
            <Input value={formValues.templateName} onChange={set("templateName")} placeholder="Template Name" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Persona</label>
            <Input value={formValues.persona} onChange={set("persona")} placeholder="admin / assistant / client" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <Input value={formValues.subject} onChange={set("subject")} placeholder="Email subject" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Body</label>
            <Textarea value={formValues.body} onChange={set("body")} className="min-h-[220px]" />
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
