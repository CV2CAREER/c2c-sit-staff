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
import {
  composeExternalActionEmailBody,
  isGuideAvailable,
  readExternalActionConfig,
  readInstructionsBody,
} from "@/constants/missing-info-field-types";
import LinkifiedText from "@/components/LinkifiedText/LinkifiedText";

interface ClientPreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: MissingInfoTemplate;
  onSend?: () => void;
}

/**
 * SPR-21-52: what the customer sees for an External Action block, built from the LIVE (unsaved)
 * builder config: guidance, the action button, the optional guide (hidden when the toggle is
 * off) and the completion button. Read-only: the buttons do nothing here.
 */
function ExternalActionPreview({ field }: { field: MissingInfoTemplateField }) {
  const cfg = readExternalActionConfig(field.options);
  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-3.5">
        <div className="text-[13px] font-semibold text-[#1F2937]">{field.fieldLabel}</div>
        {cfg.guidanceText && (
          <p className="mt-1 mb-0 whitespace-pre-line text-[12px] leading-relaxed text-[#6B7280]">
            {cfg.guidanceText}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-[#0B96D6] px-3 py-2 text-[12px] font-medium text-white">
            {cfg.actionLabel || "Open external link"}
          </span>
          {isGuideAvailable(cfg) && (
            <span className="inline-flex items-center rounded-lg border border-[#0B96D6] px-3 py-2 text-[12px] font-medium text-[#0B96D6]">
              View step-by-step guide
            </span>
          )}
        </div>
        {!cfg.appealUrl && (
          <p className="mt-2 mb-0 text-[11px] text-[#B45309]">No external link set yet.</p>
        )}
        {cfg.showGuide && !cfg.guideUrl && (
          <p className="mt-1 mb-0 text-[11px] text-[#B45309]">
            The guide is switched on but no guide link is set, so the customer won&apos;t see it.
          </p>
        )}
      </div>
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-3.5">
        <div className="text-[12px] font-semibold text-[#1F2937]">Finished the external step?</div>
        <p className="mt-1 mb-0 text-[12px] text-[#6B7280]">
          Come back here once you have completed it, then confirm below so we can continue your case.
        </p>
        <span
          className={`mt-2.5 inline-flex items-center rounded-lg px-3 py-2 text-[12px] font-medium ${
            cfg.appealUrl ? "bg-gray-300 text-gray-500" : "bg-emerald-600 text-white"
          }`}
        >
          {cfg.completionLabel || "I've completed this step"}
        </span>
        {cfg.appealUrl && (
          <p className="mt-2 mb-0 text-[11px] text-[#6B7280]">
            Greyed out until the customer has opened &ldquo;{cfg.actionLabel || "the external link"}&rdquo;.
          </p>
        )}
        {!cfg.requireCompletion && (
          <p className="mt-2 mb-0 text-[11px] text-[#6B7280]">Completion confirmation is optional for this request.</p>
        )}
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: MissingInfoTemplateField }) {
  const placeholder = field.helpText || "\u2014";

  switch (field.fieldType) {
    case "external_action":
      return <ExternalActionPreview field={field} />;
    case "instructions": {
      // Display-only text, with links rendered exactly as the customer will see them.
      const body = readInstructionsBody(field.options);
      return (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
          {field.fieldLabel && <div className="text-[13px] font-semibold text-[#1F2937]">{field.fieldLabel}</div>}
          <p className="mt-1 mb-0 whitespace-pre-line text-[12px] leading-relaxed text-[#6B7280]">
            {body ? <LinkifiedText text={body} /> : "(No instructions text yet)"}
          </p>
        </div>
      );
    }
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

  // SPR-21-52: live External Action settings (if the template has the block)
  const externalActionField = fields.find((f) => f.fieldType === "external_action");
  const externalAction = externalActionField ? readExternalActionConfig(externalActionField.options) : null;

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
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
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
                      {group.fields.map((field, i) => (
                        <div key={field.id ?? `${field.fieldName}-${i}`} className={field.fieldType === "textarea" ? "col-span-2" : ""}>
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
              {visibleFields.map((field, i) => (
                // Preview fields built from unsaved builder state have no id yet.
                <div
                  key={field.id ?? `${field.fieldName}-${i}`}
                  className={
                    field.fieldType === "textarea" ||
                    field.fieldType === "external_action" ||
                    field.fieldType === "instructions"
                      ? "col-span-2"
                      : ""
                  }
                >
                  {field.fieldType !== "external_action" && field.fieldType !== "instructions" && (
                    <Label className="text-[11px] font-semibold text-[#1F2937] mb-1.5 block">
                      {field.fieldLabel}
                      {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                  )}
                  <PreviewField field={field} />
                </div>
              ))}
            </div>
          )}
        </div>

        {externalAction && (
          <div className="mt-1 rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-[11px] text-[#6B7280] mb-1">Email the customer receives</div>
            <div className="text-[13px] font-semibold text-[#10365A]">
              {externalAction.emailSubject || "Action Required: Information needed for your application"}
            </div>
            <p className="mt-1.5 mb-0 whitespace-pre-line text-[12px] leading-relaxed text-[#374151]">
              {composeExternalActionEmailBody(externalAction) || "(No message body set)"}
            </p>
            <p className="mt-2 mb-0 text-[11px] text-[#9CA3AF]">
              The email&apos;s usual button then opens the request, where the customer sees the block above.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2.5 mt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="border border-[#E5E9EF] text-[#10365A] font-semibold text-[13px]"
          >
            Cancel
          </Button>
          <Button onClick={onClose} className="bg-[#0B96D6] text-white font-semibold text-[13px]">
            Back to edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
