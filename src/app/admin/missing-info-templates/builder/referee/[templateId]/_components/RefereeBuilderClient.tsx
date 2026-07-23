"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useMissingInfoTemplate } from "@/hooks/api/missing-info-template.api";
import { REFEREE_DEFAULT_FIELDS } from "@/constants/missing-info-field-types";
import BuilderToolbar from "../../../BuilderToolbar";
import RefereeCountStepper from "./RefereeCountStepper";
import FieldToggleTable, { FieldToggleRow } from "./FieldToggleTable";

function buildInitialFields(refereeCount: number, existingFields?: any[]): FieldToggleRow[] {
  if (existingFields && existingFields.length > 0) {
    const blockFields = existingFields.filter(
      (f: any) => f.isRefereeBlock && f.refereeBlockIndex === 1,
    );
    if (blockFields.length > 0) {
      return blockFields.map((f: any) => ({
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
  return fields;
}

export default function RefereeBuilderClient() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  const { templateDomain, actions } = useMissingInfoTemplate(templateId);
  const template = templateDomain.data;

  const [templateName, setTemplateName] = useState("");
  const [refereeCount, setRefereeCount] = useState(3);
  const [blockTemplate, setBlockTemplate] = useState<FieldToggleRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<string>("references");

  useEffect(() => {
    if (template && !loaded) {
      setTemplateName(template.name);
      setCategory(template.category || "references");
      const blockFields = template.fields?.filter(
        (f: any) => f.isRefereeBlock && f.refereeBlockIndex === 1,
      );
      const maxBlockIndex = template.fields
        ?.filter((f: any) => f.isRefereeBlock)
        .reduce((max: number, f: any) => Math.max(max, f.refereeBlockIndex || 0), 0) || 3;
      setRefereeCount(maxBlockIndex);
      setBlockTemplate(buildInitialFields(maxBlockIndex, template.fields));
      setLoaded(true);
    }
  }, [template, loaded]);

  const handleTypeChange = async (newType: string) => {
    if (newType === "free_form") {
      await actions.updateTemplate({
        name: templateName.trim() || template?.name,
        type: "free_form",
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

  const handleCountChange = useCallback(
    (newCount: number) => {
      setRefereeCount(newCount);
    },
    [],
  );

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const toastId = toast.loading("Saving template...");
    try {
      const fields = buildFieldsArray(refereeCount, blockTemplate);
      await actions.updateTemplate({
        name: templateName.trim(),
        category,
        fields,
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
      const fields = buildFieldsArray(refereeCount, blockTemplate);
      await actions.updateTemplate({
        name: templateName.trim(),
        category,
        fields,
      });
      await actions.publishTemplate();
      toast.dismiss(toastId);
      toast.success("Template published.");
      router.push("/admin/missing-info-templates");
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
          onClick={() => router.push("/admin/missing-info-templates")}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to templates
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen flex flex-col">
      <BuilderToolbar
        templateName={templateName}
        onNameChange={setTemplateName}
        onSave={handleSave}
        onPublish={handlePublish}
        isSaving={actions.isSaving}
        isPublishing={actions.isPublishing}
        isPublished={template.status === "published"}
        backHref="/admin/missing-info-templates"
        category={category}
        onCategoryChange={handleCategoryChange}
        type="referee_block"
        onTypeChange={handleTypeChange}
      />
      <div className="flex-1 p-6">
        <RefereeCountStepper count={refereeCount} onChange={handleCountChange} />
        <FieldToggleTable fields={blockTemplate} onChange={setBlockTemplate} />
      </div>
    </div>
  );
}
