"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import toast from "react-hot-toast";
import { useMissingInfoTemplate } from "@/hooks/api/missing-info-template.api";
import { REFEREE_DEFAULT_FIELDS } from "@/constants/missing-info-field-types";
import { FieldToggleRow } from "../../../referee/[templateId]/_components/FieldToggleTable";
import BuilderToolbar from "../../../BuilderToolbar";
import FieldTypePanel from "./FieldTypePanel";
import FormPreview from "./FormPreview";
import FieldProperties, { FreeFormField } from "./FieldProperties";
import ClientPreviewModal from "../../../../_modals/ClientPreviewModal";

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

// Collapse expanded referee block rows back into a single block card so the
// free-form preview never renders one "REFEREE × N" card per sub-field.
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

export default function FreeFormBuilderClient() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  const { templateDomain, actions } = useMissingInfoTemplate(templateId);
  const template = templateDomain.data;

  const [templateName, setTemplateName] = useState("");
  const [fields, setFields] = useState<FreeFormField[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<string>("references");
  const [blockTemplate, setBlockTemplate] = useState<FieldToggleRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewTemplate = useMemo(() => {
    if (!template) return null;
    const apiFields = fieldsToApi(fields, blockTemplate);
    return {
      ...template,
      fields: apiFields,
    };
  }, [template, fields, blockTemplate]);

  useEffect(() => {
    if (template && !loaded) {
      setTemplateName(template.name);
      setCategory(template.category || "references");
      if (template.fields && template.fields.length > 0) {
        setFields(collapseRefereeFields(template.fields));
      }
      const blockFields = template.fields?.filter(
        (f: any) => f.isRefereeBlock && f.refereeBlockIndex === 1,
      );
      if (blockFields && blockFields.length > 0) {
        setBlockTemplate(blockFields.map((f: any) => ({
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          isVisible: f.isVisible,
          helpText: f.helpText ?? null,
        })));
      }
      setLoaded(true);
    }
  }, [template, loaded]);

  const handleTypeChange = async (newType: string) => {
    if (newType === "referee_block") {
      await actions.updateTemplate({
        name: templateName.trim() || template?.name,
        type: "referee_block",
        category,
        fields: [],
      });
      if (templateId) {
        router.push(`/admin/missing-info-templates/builder/${templateId}`);
      }
    }
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

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const toastId = toast.loading("Saving template...");
    try {
      const apiFields = fieldsToApi(fields, blockTemplate);
      await actions.updateTemplate({
        name: templateName.trim(),
        category,
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
      const apiFields = fieldsToApi(fields, blockTemplate);
      await actions.updateTemplate({
        name: templateName.trim(),
        category,
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
          type="free_form"
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
              onSwitchToReferee={() => router.push(`/admin/missing-info-templates/builder/${templateId}?type=referee_block`)}
            />
          </div>
        </div>
      </div>
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
    </DndProvider>
  );
}
