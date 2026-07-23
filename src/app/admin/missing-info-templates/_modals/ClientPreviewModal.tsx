"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MissingInfoTemplate, MissingInfoTemplateField } from "@/hooks/api/missing-info-template.api";

interface ClientPreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: MissingInfoTemplate;
  onSend?: () => void;
}

function PreviewField({ field }: { field: MissingInfoTemplateField }) {
  const placeholder = field.helpText || "\u2014";

  switch (field.fieldType) {
    case "textarea":
      return (
        <Textarea
          disabled
          placeholder={placeholder}
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] min-h-[60px] resize-none"
        />
      );
    case "select":
      return (
        <Select>
          <SelectTrigger disabled className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] text-[#9CA3AF] h-9">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt, i) => (
              <SelectItem key={i} value={opt.value} disabled>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "checkbox":
      return (
        <div className="flex flex-col gap-1">
          {(field.options as any[])?.map((opt) => {
            const label = typeof opt === "string" ? opt : opt.label || opt.value
            const value = typeof opt === "string" ? opt : opt.value
            const id = `preview-${field.id}-${value}`
            return (
              <div key={value} className="flex items-center gap-2 h-7">
                <Checkbox id={id} disabled />
                <Label htmlFor={id} className="text-[13px] text-[#9CA3AF] font-normal">
                  {label}
                </Label>
              </div>
            )
          })}
        </div>
      );
    case "date":
      return (
        <Input
          type="date"
          disabled
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9"
        />
      );
    case "email":
      return (
        <Input
          type="email"
          disabled
          placeholder={placeholder}
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9"
        />
      );
    case "phone":
      return (
        <Input
          type="tel"
          disabled
          placeholder={placeholder}
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9"
        />
      );
    case "number":
      return (
        <Input
          type="number"
          disabled
          placeholder={placeholder}
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9"
        />
      );
    case "radio":
      return (
        <Input
          disabled
          placeholder={placeholder}
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9"
        />
      );
    case "file":
      return (
        <Input
          type="file"
          disabled
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#0B96D6] file:text-white"
        />
      );
    default:
      return (
        <Input
          disabled
          placeholder={placeholder}
          className="border border-[#E5E7EB] bg-[#F9FAFB] text-[13px] h-9"
        />
      );
  }
}

export default function ClientPreviewModal({
  open,
  onClose,
  template,
  onSend,
}: ClientPreviewModalProps) {
  const fields = template.fields ?? [];
  const refereeCount = template.type === "referee_block"
    ? Math.max(...fields.map((f) => f.refereeBlockIndex ?? 0), 0)
    : 0;

  const visibleFields = fields.filter((f) => f.isVisible);

  const refereeGroups = React.useMemo(() => {
    if (template.type !== "referee_block") return [];
    const groups: { index: number; fields: MissingInfoTemplateField[] }[] = [];
    for (let i = 1; i <= refereeCount; i++) {
      const groupFields = visibleFields.filter((f) => f.refereeBlockIndex === i);
      if (groupFields.length > 0) {
        groups.push({ index: i, fields: groupFields });
      }
    }
    return groups;
  }, [visibleFields, refereeCount, template.type]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[540px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[17px] text-[#10365A]">
            Client preview &ldquo;{template.name}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="bg-[#FFF8E8] border border-[#F3E0A8] rounded-lg px-3 py-2.5 text-[11px] text-[#6B5B1E] leading-relaxed flex gap-2 items-start">
          <span>Read-only preview of exactly what the client will see. The data-use disclaimer shows first, then this form.</span>
        </div>

        <div className="bg-[#F9FAFB] rounded-xl p-5 mt-1">
          <div className="text-[11px] text-[#6B7280] mb-1.5">Missing information request</div>
          <h4 className="text-[15px] font-semibold text-[#10365A] m-0 mb-1">
            {template.type === "referee_block"
              ? "We need referee details to complete your application"
              : "We need some information to complete your application"}
          </h4>
          <p className="text-[12px] text-[#6B7280] mb-4 m-0">
            {template.type === "referee_block"
              ? <>This request includes <strong>{refereeGroups.length}</strong> referee{refereeGroups.length !== 1 ? "s" : ""} to complete this application.</>
              : <>This request includes <strong>{visibleFields.length}</strong> field{visibleFields.length !== 1 ? "s" : ""} to complete this application.</>}
          </p>

          {template.type === "referee_block" ? (
            <Accordion type="single" collapsible defaultValue="referee-1" className="space-y-2">
              {refereeGroups.map((group) => (
                <AccordionItem key={group.index} value={`referee-${group.index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="text-sm font-medium text-[#1F2937]">
                      Referee {group.index} of {refereeGroups.length}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-3">
                      {group.fields.map((field) => (
                        <div key={field.id} className={field.fieldType === "textarea" ? "col-span-2" : ""}>
                          <Label className="text-[11px] font-semibold text-[#1F2937] mb-1.5 block">
                            {field.fieldLabel}
                            {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          <PreviewField field={field} />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visibleFields.map((field) => (
                <div key={field.id} className={field.fieldType === "textarea" ? "col-span-2" : ""}>
                  <Label className="text-[11px] font-semibold text-[#1F2937] mb-1.5 block">
                    {field.fieldLabel}
                    {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <PreviewField field={field} />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2.5 mt-1">
          <Button onClick={onClose} className="bg-[#0B96D6] text-white font-semibold text-[13px]">
            Back to edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
