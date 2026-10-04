"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import toast from "react-hot-toast";
import { useMissingInfoTemplate } from "@/hooks/api/missing-info-template.api";
import { REFEREE_DEFAULT_FIELDS } from "@/constants/missing-info-field-types";
import BuilderToolbar from "../../BuilderToolbar";
import FieldTypePanel from "../../freeform/[templateId]/_components/FieldTypePanel";
import FormPreview from "../../freeform/[templateId]/_components/FormPreview";
import FieldProperties, { FreeFormField } from "../../freeform/[templateId]/_components/FieldProperties";
import RefereeCountStepper from "../../referee/[templateId]/_components/RefereeCountStepper";
import FieldToggleTable, { FieldToggleRow } from "../../referee/[templateId]/_components/FieldToggleTable";
import ClientPreviewModal from "../../../_modals/ClientPreviewModal";

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
};

function toFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildFormField(existing: any): FreeFormField {
  return {
    fieldName: existing.fieldName,
    fieldLabel: existing.fieldLabel,
    fieldType: existing.fieldType,
    isRequired: existing.isRequired,
    isVisible: existing.isVisible,
    helpText: existing.helpText,
    isRefereeBlock: existing.isRefereeBlock || false,
    refereeBlockIndex: existing.refereeBlockIndex || null,
    options: existing.options || null,
    isRepeatable: existing.isRepeatable || false,
    validation: existing.validation || null,
  };
}

function createNewField(fieldType: string): FreeFormField {
  const label = fieldType === "referee_block"
    ? "Referee Information"
    : FIELD_TYPE_LABELS[fieldType] || fieldType;
  const needsOptions = fieldType === "select" || fieldType === "checkbox";
  return {
    fieldName: toFieldName(label),
    fieldLabel: label,
    fieldType,
    isRequired: false,
    isVisible: true,
    helpText: null,
    isRefereeBlock: fieldType === "referee_block",
    refereeBlockIndex: null,
    options: needsOptions ? [{ label: "", value: "" }] : null,
    isRepeatable: false,
    validation: null,
  };
}

// The free-form builder treats a referee block as ONE field card that expands
// to its sub-fields on the client form. When a stored referee template is
// loaded, its expanded block rows must be collapsed back to that single card —
// otherwise switching to free-form renders one "REFERRER × N" card per
// sub-field.
function collapseRefereeFields(templateFields: any[]): FreeFormField[] {
  const hasReferee = templateFields.some((f: any) => f.isRefereeBlock);
  if (!hasReferee) return templateFields.map(buildFormField);
  const blockField = createNewField("referee_block");
  const nonBlock = templateFields
    .filter((f: any) => !f.isRefereeBlock)
    .map(buildFormField);
  return [blockField, ...nonBlock];
}

function fieldsToApi(fields: FreeFormField[], blockTemplate?: FieldToggleRow[]): any[] {
  const refereeTemplate = (blockTemplate && blockTemplate.length > 0)
    ? blockTemplate
    : REFEREE_DEFAULT_FIELDS.map((f) => ({ fieldName: f.fieldName, fieldLabel: f.fieldLabel, fieldType: f.fieldType, isRequired: f.isRequired, isVisible: f.isVisible, helpText: f.helpText ?? null }));
  return fields.map((field, sortOrder) => {
    if (field.isRefereeBlock) {
      return refereeTemplate.map((subField, subSortOrder) => ({
        fieldName: subField.fieldName,
        fieldLabel: subField.fieldLabel,
        fieldType: subField.fieldType,
        isRequired: subField.isRequired,
        isVisible: subField.isVisible,
        helpText: subField.helpText ?? null,
        sortOrder: subSortOrder,
        isRefereeBlock: true,
        refereeBlockIndex: 1,
      }));
    }
    return {
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isVisible: field.isVisible,
      helpText: field.helpText,
      sortOrder,
      isRefereeBlock: false,
      refereeBlockIndex: null,
      options: field.options,
      isRepeatable: field.isRepeatable,
      validation: field.validation,
    };
  }).flat();
}

function buildInitialFields(refereeCount: number, existingFields?: any[]): FieldToggleRow[] {
  if (existingFields && existingFields.length > 0) {
    const blockFields = existingFields.filter(
      (f: any) => f.isRefereeBlock && f.refereeBlockIndex === 1,
    );
    if (blockFields.length > 0) {
      // Dedupe by fieldName — corrupt/historically-duplicated rows must never
      // render as repeated copies of the same block field.
      const seen = new Set<string>();
      const unique: any[] = [];
      for (const f of blockFields) {
        const key = f.fieldName || f.fieldLabel;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(f);
      }
      return unique.map((f: any) => ({
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        isVisible: f.isVisible,
        helpText: f.helpText,
      }));
    }
  }
  return REFEREE_DEFAULT_FIELDS.map((f) => ({
    ...f,
    helpText: f.helpText ?? null,
  }));
}

function buildFieldsArray(
  refereeCount: number,
  blockTemplate: FieldToggleRow[],
  extraFields: FreeFormField[] = [],
): any[] {
  const fields: any[] = [];
  for (let blockIndex = 1; blockIndex <= refereeCount; blockIndex++) {
    blockTemplate.forEach((field, sortOrder) => {
      fields.push({
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        isVisible: field.isVisible,
        helpText: field.helpText,
        sortOrder,
        isRefereeBlock: true,
        refereeBlockIndex: blockIndex,
      });
    });
  }
  // Preserve any free-form (non-block) fields so they aren't lost when
  // editing a hybrid template from the referee builder.
  extraFields.forEach((f, i) => {
    fields.push({
      fieldName: f.fieldName,
      fieldLabel: f.fieldLabel,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      isVisible: f.isVisible,
      helpText: f.helpText,
      options: f.options,
      isRepeatable: f.isRepeatable,
      validation: f.validation,
      sortOrder: refereeCount * blockTemplate.length + i,
      isRefereeBlock: false,
      refereeBlockIndex: null,
    });
  });
  return fields;
}

type BuilderType = "free_form" | "referee_block";

export default function UnifiedBuilderClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = params.templateId as string;

  const { templateDomain, actions } = useMissingInfoTemplate(templateId);
  const template = templateDomain.data;

  const forcedType = searchParams?.get("type") as BuilderType | null;
  const [templateName, setTemplateName] = useState("");
  const [builderType, setBuilderType] = useState<BuilderType>(
    forcedType === "referee_block" ? "referee_block" : "free_form",
  );
  const [category, setCategory] = useState<string>("references");
  const [loaded, setLoaded] = useState(false);

  const [fields, setFields] = useState<FreeFormField[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [refereeCount, setRefereeCount] = useState(3);
  const [blockTemplate, setBlockTemplate] = useState<FieldToggleRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (forcedType && !loaded) {
      setBuilderType(forcedType);
    }
  }, [forcedType, loaded]);

  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setCategory(template.category || "references");
      if (!loaded) {
        if (!forcedType) {
          const hasRefereeFields = (template.fields || []).some(
            (f: any) => f.isRefereeBlock,
          );
          const effectiveType =
            template.type === "referee_block" || hasRefereeFields
              ? "referee_block"
              : "free_form";
          setBuilderType(effectiveType);
        }
        if (template.fields && template.fields.length > 0) {
          setFields(collapseRefereeFields(template.fields));
        }
      }
      const maxBlockIndex = template.fields
        ?.filter((f: any) => f.isRefereeBlock)
        .reduce((max: number, f: any) => Math.max(max, f.refereeBlockIndex || 0), 0) || 3;
      setRefereeCount(maxBlockIndex);
      setBlockTemplate(buildInitialFields(maxBlockIndex, template.fields));
      if (!loaded) setLoaded(true);
    }
  }, [template, loaded, forcedType]);

  const nonBlockFields = useMemo(
    () => fields.filter((f) => !f.isRefereeBlock),
    [fields],
  );

  const previewTemplate = useMemo(() => {
    if (!template) return null;
    if (builderType === "free_form") {
      return { ...template, fields: fieldsToApi(fields, blockTemplate) };
    }
    return {
      ...template,
      fields: buildFieldsArray(refereeCount, blockTemplate, nonBlockFields),
    };
  }, [template, builderType, fields, refereeCount, blockTemplate, nonBlockFields]);

  const handleTypeChange = (newType: string) => {
    setBuilderType(newType as BuilderType);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
  };

  const handleAddField = useCallback((fieldType: string) => {
    const newField = createNewField(fieldType);
    setFields((prev) => [...prev, newField]);
    setSelectedIndex(fields.length);
  }, [fields.length]);

  const handleSelectField = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleFieldChange = useCallback((updated: FreeFormField) => {
    setFields((prev) =>
      prev.map((f, i) => (i === selectedIndex ? updated : f)),
    );
  }, [selectedIndex]);

  const handleMoveField = useCallback((fromIndex: number, toIndex: number) => {
    setFields((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setSelectedIndex(toIndex);
  }, []);

  const handleDeleteField = useCallback(() => {
    if (selectedIndex === null) return;
    setFields((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  }, [selectedIndex]);

  const handleCountChange = useCallback((newCount: number) => {
    setRefereeCount(newCount);
  }, []);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const toastId = toast.loading("Saving template...");
    try {
      const apiFields = builderType === "free_form"
        ? fieldsToApi(fields, blockTemplate)
        : buildFieldsArray(refereeCount, blockTemplate, nonBlockFields);
      await actions.updateTemplate({
        name: templateName.trim(),
        category,
        type: builderType,
        fields: apiFields,
      });
      toast.dismiss(toastId);
      toast.success("Template saved.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || "Failed to save.");
    }
  };

  const handlePublish = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const toastId = toast.loading("Publishing template...");
    try {
      const apiFields = builderType === "free_form"
        ? fieldsToApi(fields, blockTemplate)
        : buildFieldsArray(refereeCount, blockTemplate, nonBlockFields);
      await actions.updateTemplate({
        name: templateName.trim(),
        category,
        type: builderType,
        fields: apiFields,
      });
      await actions.publishTemplate();
      toast.dismiss(toastId);
      toast.success("Template published.");
      router.push("/admin/missing-information");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || e?.message || "Failed to publish.");
    }
  };

  if (templateDomain.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (templateDomain.isError || !template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500 text-sm">Failed to load template.</p>
        <button
          onClick={() => router.push("/admin/missing-information")}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to templates
        </button>
      </div>
    );
  }

  return (
    <>
      {builderType === "free_form" ? (
        <DndProvider backend={HTML5Backend}>
          <div className="bg-[#F3F4F6] min-h-screen flex flex-col">
            <BuilderToolbar
              templateName={templateName}
              onNameChange={setTemplateName}
              onSave={handleSave}
              onPublish={handlePublish}
              onPreview={() => setPreviewOpen(true)}
              isSaving={actions.isSaving}
              isPublishing={actions.isPublishing}
              isPublished={template.status === "published"}
              backHref="/admin/missing-information"
              category={category}
              onCategoryChange={handleCategoryChange}
              type={builderType}
              onTypeChange={handleTypeChange}
            />
            <div className="flex-1 p-6">
              <div className="grid grid-cols-[210px_1fr_250px] gap-[18px]">
                <FieldTypePanel onAddField={handleAddField} />
                <FormPreview
                  fields={fields}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelectField}
                  onMoveField={handleMoveField}
                />
                <FieldProperties
                  field={selectedIndex !== null ? fields[selectedIndex] : null}
                  onChange={handleFieldChange}
                  onDelete={handleDeleteField}
                  templateId={templateId}
                  onSwitchToReferee={() => setBuilderType("referee_block")}
                />
              </div>
            </div>
          </div>
        </DndProvider>
      ) : (
        <div className="bg-[#F3F4F6] min-h-screen flex flex-col">
          <BuilderToolbar
            templateName={templateName}
            onNameChange={setTemplateName}
            onSave={handleSave}
            onPublish={handlePublish}
            isSaving={actions.isSaving}
            isPublishing={actions.isPublishing}
            isPublished={template.status === "published"}
            backHref="/admin/missing-information"
            category={category}
            onCategoryChange={handleCategoryChange}
            type={builderType}
            onTypeChange={handleTypeChange}
          />
          <div className="flex-1 p-6">
            <RefereeCountStepper count={refereeCount} onChange={handleCountChange} />
            <FieldToggleTable fields={blockTemplate} onChange={setBlockTemplate} />
          </div>
        </div>
      )}

      {previewOpen && previewTemplate && (
        <ClientPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onSend={async () => {
            setPreviewOpen(false);
            await handleSave();
            router.push("/admin/missing-information");
          }}
          template={previewTemplate as any}
        />
      )}
    </>
  );
}
