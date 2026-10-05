"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalActionConfig,
  INSTRUCTIONS_MAX_LENGTH,
  REFEREE_DEFAULT_FIELDS,
  isGuideAvailable,
  readExternalActionConfig,
  readInstructionsBody,
} from "@/constants/missing-info-field-types";

export interface FreeFormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  helpText: string | null;
  isRefereeBlock: boolean;
  refereeBlockIndex: number | null;
  // select/checkbox keep a list of options; an external_action block keeps its settings object;
  // an instructions block keeps its text as { body }.
  options: { label: string; value: string }[] | ExternalActionConfig | { body: string } | null;
  isRepeatable: boolean;
  validation: Record<string, any> | null;
}

interface FieldPropertiesProps {
  field: FreeFormField | null;
  onChange: (field: FreeFormField) => void;
  onDelete: () => void;
  templateId: string;
  onSwitchToReferee?: () => void;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  date: "Date picker",
  select: "Dropdown",
  checkbox: "Multi-select",
  file: "File upload",
  number: "Number",
  phone: "Phone",
  email: "Email",
  referee_block: "Referee block",
  external_action: "External action",
};

const LABEL_CLASS = "text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5";
const INPUT_CLASS = "w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md";

const linkError = (value: string): string =>
  value && !/^https?:\/\//i.test(value.trim()) ? "Must start with http:// or https://" : "";

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-[38px] h-[22px] rounded-full border-0 padding-0 cursor-pointer transition-colors ${
        checked ? "bg-[#0B96D6]" : "bg-[#D9DEE5]"
      }`}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all ${
          checked ? "left-[18px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

export default function FieldProperties({ field, onChange, onDelete, templateId, onSwitchToReferee }: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4 flex items-center justify-center h-full min-h-[200px]">
        <p className="text-[12px] text-[#9CA3AF] text-center">
          Select a field from the preview to edit its properties.
        </p>
      </div>
    );
  }

  if (field.isRefereeBlock) {
    return (
      <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4">
        <div className="text-[12px] font-semibold text-[#0B96D6] mb-3">
          Editing: {field.fieldLabel}
        </div>
        <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
          Field type
        </div>
        <div className="text-[13px] text-[#1F2937] mb-3">Referee block ({REFEREE_DEFAULT_FIELDS.length} sub-fields)</div>
        <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
          Sub-fields
        </div>
        <div className="text-[12px] text-[#6B7280] mb-3">
          Referee blocks contain predefined fields.
        </div>
        <button
          onClick={onSwitchToReferee}
          className="text-[#0B96D6] font-semibold hover:underline text-[12px] mb-3"
        >
          Edit in Referee Block builder →
        </button>
        <button
          onClick={onDelete}
          className="w-full border border-[#FCA5A5] text-[#DC2626] bg-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-50 transition-colors"
        >
          Delete field
        </button>
      </div>
    );
  }

  // SPR-21-52: External action block. Sends the customer to an external process and records only
  // that they completed it. Settings are saved in `options`; `isRequired` mirrors the
  // "require completion confirmation" toggle so the server blocks submission until it is done.
  if (field.fieldType === "external_action") {
    const cfg = readExternalActionConfig(field.options);
    const update = (patch: Partial<ExternalActionConfig>) => {
      const next = { ...cfg, ...patch };
      onChange({ ...field, options: next, isRequired: next.requireCompletion });
    };
    const appealError = linkError(cfg.appealUrl);
    const guideError = linkError(cfg.guideUrl);

    return (
      <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4">
        <div className="text-[12px] font-semibold text-[#0B96D6] mb-3">Editing: External action</div>

        <div className={LABEL_CLASS}>Heading shown to the customer</div>
        <Input
          type="text"
          value={field.fieldLabel}
          onChange={(e) => onChange({ ...field, fieldLabel: e.target.value })}
          className={INPUT_CLASS}
        />

        <div className={LABEL_CLASS}>Action label</div>
        <Input
          type="text"
          value={cfg.actionLabel}
          onChange={(e) => update({ actionLabel: e.target.value })}
          placeholder="Open Indeed appeal"
          className={INPUT_CLASS}
        />

        <div className={LABEL_CLASS}>Completion label</div>
        <Input
          type="text"
          value={cfg.completionLabel}
          onChange={(e) => update({ completionLabel: e.target.value })}
          placeholder="I've completed the appeal"
          className={INPUT_CLASS}
        />

        <div className={LABEL_CLASS}>External appeal link</div>
        <Input
          type="url"
          value={cfg.appealUrl}
          onChange={(e) => update({ appealUrl: e.target.value })}
          placeholder="https://..."
          className={appealError ? INPUT_CLASS.replace("mb-3", "mb-1") : INPUT_CLASS}
        />
        {appealError && <p className="text-[11px] text-red-500 mb-3">{appealError}</p>}

        <div className={LABEL_CLASS}>Guide link (optional)</div>
        <Input
          type="url"
          value={cfg.guideUrl}
          onChange={(e) => update({ guideUrl: e.target.value })}
          placeholder="https://... (Scribe or similar)"
          className={guideError ? INPUT_CLASS.replace("mb-3", "mb-1") : INPUT_CLASS}
        />
        {guideError && <p className="text-[11px] text-red-500 mb-3">{guideError}</p>}

        <div className={LABEL_CLASS}>Email subject</div>
        <Input
          type="text"
          value={cfg.emailSubject}
          onChange={(e) => update({ emailSubject: e.target.value })}
          className={INPUT_CLASS}
        />

        <div className={LABEL_CLASS}>Email body</div>
        <Textarea
          value={cfg.emailBody}
          onChange={(e) => update({ emailBody: e.target.value })}
          rows={6}
          className="w-full text-[13px] mb-1 border border-[#E5E9EF] rounded-md"
        />
        <p className="text-[11px] text-[#9CA3AF] mb-3">
          {isGuideAvailable(cfg)
            ? "A guide is available, so the email also points the customer to it (unless your text already mentions a guide)."
            : "No guide is available (switched off or no guide link), so the email will not mention one."}
          {!isGuideAvailable(cfg) && /guide/i.test(cfg.emailBody.replace(/If you need help understanding the process, use the step-by-step guide\./, "")) && (
            <span className="block text-[#B45309]">
              Your text mentions a guide, but none is available. Remove that wording or add a guide link.
            </span>
          )}
        </p>

        <div className={LABEL_CLASS}>Customer guidance</div>
        <Textarea
          value={cfg.guidanceText}
          onChange={(e) => update({ guidanceText: e.target.value })}
          rows={4}
          className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
        />

        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[12px] text-[#6B7280] font-medium">Show step-by-step guide</div>
            <div className="text-[11px] text-[#9CA3AF]">Guide link is available to the customer</div>
          </div>
          <Toggle checked={cfg.showGuide} onToggle={() => update({ showGuide: !cfg.showGuide })} />
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] text-[#6B7280] font-medium">Require completion confirmation</div>
            <div className="text-[11px] text-[#9CA3AF]">Customer confirms the external step is done</div>
          </div>
          <Toggle
            checked={cfg.requireCompletion}
            onToggle={() => update({ requireCompletion: !cfg.requireCompletion })}
          />
        </div>

        <div className="mb-3 rounded-lg border border-[#EFD59D] bg-[#FFF7E5] px-2.5 py-2 text-[11px] text-[#6D561D]">
          <b>Not collected:</b> appeal documents, ticket/case number, appeal date, appeal status details or
          other external-case evidence.
        </div>

        <button
          onClick={onDelete}
          className="w-full border border-[#FCA5A5] text-[#DC2626] bg-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-50 transition-colors"
        >
          Delete field
        </button>
      </div>
    );
  }

  // Instructions block: free text the customer reads. No input, never required, links are clickable.
  if (field.fieldType === "instructions") {
    const body = readInstructionsBody(field.options);
    return (
      <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4">
        <div className="text-[12px] font-semibold text-[#0B96D6] mb-3">Editing: Instructions</div>

        <div className={LABEL_CLASS}>Heading (optional)</div>
        <Input
          type="text"
          value={field.fieldLabel}
          onChange={(e) => onChange({ ...field, fieldLabel: e.target.value })}
          placeholder="e.g. Before you start"
          className={INPUT_CLASS}
        />

        <div className={LABEL_CLASS}>Instructions for the customer</div>
        <Textarea
          value={body}
          onChange={(e) =>
            onChange({ ...field, isRequired: false, options: { body: e.target.value.slice(0, INSTRUCTIONS_MAX_LENGTH) } })
          }
          rows={8}
          placeholder="Write what the customer should know or do."
          className="w-full text-[13px] mb-1 border border-[#E5E9EF] rounded-md"
        />
        <div className="mb-3 flex justify-between text-[11px] text-[#9CA3AF]">
          <span>
            Links work: paste https://… or write [link text](https://…).
          </span>
          <span>
            {body.length}/{INSTRUCTIONS_MAX_LENGTH}
          </span>
        </div>
        {!body.trim() && (
          <p className="mb-3 text-[11px] text-red-500">The instructions text is required.</p>
        )}

        <div className="mb-3 rounded-lg border border-[#E5E9EF] bg-[#F9FAFB] px-2.5 py-2 text-[11px] text-[#6B7280]">
          Display only: the customer reads this and no answer is collected. If a template contains only
          Instructions, the customer confirms with &ldquo;I&apos;ve read this&rdquo;.
        </div>

        <button
          onClick={onDelete}
          className="w-full border border-[#FCA5A5] text-[#DC2626] bg-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-50 transition-colors"
        >
          Delete field
        </button>
      </div>
    );
  }

  const selectOptions = Array.isArray(field.options) ? field.options : [];

  return (
    <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4">
      <div className="text-[12px] font-semibold text-[#0B96D6] mb-3">
        Editing: {field.fieldLabel}
      </div>

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Field type
      </div>
      <div className="text-[13px] text-[#1F2937] mb-3">
        {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
      </div>

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Field label
      </div>
      <Input
        type="text"
        value={field.fieldLabel}
        onChange={(e) => onChange({ ...field, fieldLabel: e.target.value })}
        className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
      />

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Help text
      </div>
      <Input
        type="text"
        value={field.helpText || ""}
        onChange={(e) => onChange({ ...field, helpText: e.target.value || null })}
        placeholder="e.g. Amazon Web Services"
        className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
      />

      {(field.fieldType === "select" || field.fieldType === "checkbox") && (
        <div className="mb-3">
          <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
            {field.fieldType === "select" ? "Dropdown options" : "Multi-select options"}
          </div>
          <div className="space-y-1.5">
            {selectOptions.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-1.5">
                <Input
                  type="text"
                  value={opt.label}
                  onChange={(e) => {
                    const updated = [...selectOptions];
                    updated[optIdx] = { ...updated[optIdx], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                    onChange({ ...field, options: updated });
                  }}
                  placeholder="Label"
                  className="w-full text-[13px] border border-[#E5E9EF] rounded-md"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = selectOptions.filter((_, i) => i !== optIdx);
                    onChange({ ...field, options: updated.length > 0 ? updated : null });
                  }}
                  className="text-[#9CA3AF] hover:text-[#DC2626] text-lg leading-none px-1"
                  title="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const newOption = { label: "", value: "" };
              onChange({ ...field, options: [...selectOptions, newOption] });
            }}
            className="mt-1.5 text-[12px] text-[#0B96D6] font-semibold hover:underline"
          >
            + Add option
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] text-[#6B7280] font-medium">Required</div>
          <div className="text-[11px] text-[#9CA3AF]">Client must fill in</div>
        </div>
        <Toggle
          checked={field.isRequired}
          onToggle={() => onChange({ ...field, isRequired: !field.isRequired })}
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] text-[#6B7280] font-medium">Multiple entries</div>
          <div className="text-[11px] text-[#9CA3AF]">Repeatable field</div>
        </div>
        <Toggle
          checked={field.isRepeatable}
          onToggle={() => onChange({ ...field, isRepeatable: !field.isRepeatable })}
        />
      </div>

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Validation
      </div>
      <div className="flex items-center gap-2 mb-3">
        <select
          value={field.validation?.type || "none"}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "none") {
              onChange({ ...field, validation: null });
            } else if (val === "regex") {
              onChange({ ...field, validation: { type: "regex", pattern: "" } });
            } else if (val === "min_max") {
              onChange({ ...field, validation: { type: "min_max", min: 0, max: 999 } });
            } else if (val === "extensions") {
              onChange({ ...field, validation: { type: "extensions", allowed: [".pdf", ".doc"] } });
            }
          }}
          className="flex-1 text-[13px] border border-[#E5E9EF] rounded-md px-2.5 py-1.5 bg-white text-[#1F2937]"
        >
          <option value="none">None</option>
          {field.fieldType === "text" && <option value="regex">Regex pattern</option>}
          {field.fieldType === "text" && <option value="min_max">Min / Max length</option>}
          {field.fieldType === "textarea" && <option value="min_max">Min / Max length</option>}
          {field.fieldType === "number" && <option value="min_max">Min / Max value</option>}
          {field.fieldType === "file" && <option value="extensions">Allowed extensions</option>}
        </select>
      </div>
      {field.validation?.type === "regex" && (
        <Input
          type="text"
          value={field.validation!.pattern || ""}
          onChange={(e) => onChange({ ...field, validation: { type: "regex", pattern: e.target.value } })}
          placeholder="e.g. ^[a-zA-Z]+$"
          className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
        />
      )}
      {field.validation?.type === "min_max" && (
        <div className="flex items-center gap-2 mb-3">
          <Input
            type="number"
            value={field.validation!.min ?? ""}
            onChange={(e) => onChange({ ...field, validation: { type: "min_max", min: Number(e.target.value), max: field.validation!.max ?? 999 } })}
            placeholder="Min"
            className="w-full text-[13px] border border-[#E5E9EF] rounded-md"
          />
          <span className="text-[#9CA3AF] text-xs">to</span>
          <Input
            type="number"
            value={field.validation!.max ?? ""}
            onChange={(e) => onChange({ ...field, validation: { type: "min_max", min: field.validation!.min ?? 0, max: Number(e.target.value) } })}
            placeholder="Max"
            className="w-full text-[13px] border border-[#E5E9EF] rounded-md"
          />
        </div>
      )}
      {field.validation?.type === "extensions" && (
        <Input
          type="text"
          value={field.validation!.allowed?.join(", ") || ""}
          onChange={(e) => onChange({ ...field, validation: { type: "extensions", allowed: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) } })}
          placeholder="e.g. .pdf, .doc, .png"
          className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
        />
      )}

      <button
        onClick={onDelete}
        className="w-full border border-[#FCA5A5] text-[#DC2626] bg-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-50 transition-colors"
      >
        Delete field
      </button>
    </div>
  );
}
