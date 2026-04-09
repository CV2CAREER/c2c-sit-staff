/* eslint-disable @typescript-eslint/ban-ts-comment */
// _components/CRTrackingForm.tsx
"use client";
import React from "react";
import { useForm, Controller } from "react-hook-form";
import CreatableSelect from "react-select/creatable"; // This remains react-select
import { useCRTrackingStore } from "@/store/crTrackingStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { crTrackingSchema } from "@/utils/zodSchemas";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import { Checkbox, FormControlLabel, TextField } from "@mui/material";

// Import your custom ShadcnDatePicker
import { Button } from "@/components/ui/button";

// Import your custom Radix UI Select components
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

// Extend Day.js with the necessary plugins (ensure these are also in utils/zodSchemas.ts)
dayjs.extend(isSameOrAfter);

// Infer the TypeScript type from the Zod schema
type CRTrackingFormInputs = z.infer<
  Omit<typeof crTrackingSchema, "circularField">
> & {
  circularField?: any; // Replace 'circularField' with the actual field causing the circular reference
};

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  errorMessage?: string;
  className?: string;
  hideLabel?: boolean; // New prop to conditionally hide FormField's label
}

const FormField = ({
  label,
  required = false,
  children,
  errorMessage,
  className = "",
  hideLabel = false, // Default to false
}: FormFieldProps) => (
  <div className={`space-y-1 ${className}`}>
    {!hideLabel && ( // Conditionally render label
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    {children}
    {errorMessage && (
      <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
    )}
  </div>
);

export interface CROptionType {
  _id: string;
  name: string;
  email?: string;
  label?: string;
  value?: string;
  role?: string;
}

interface CRTrackingFormProps {
  onNext: () => void;
  onClose: () => void;
  CRTypes: string[];
  stageList: string[];
  owners: CROptionType[];
  changeList: string[];
  severityList: string[];
  familyList: string[];
  personasList: CROptionType[];
  impactedProviders: CROptionType[];
  impactedNodes: CROptionType[];
  developers: CROptionType[];
}

const CRTrackingForm = ({
  onNext,
  onClose,
  CRTypes,
  stageList,
  owners,
  changeList,
  severityList,
  familyList,
  personasList,
  impactedProviders,
  impactedNodes,
  developers,
}: CRTrackingFormProps) => {
  const { setFormData, formData } = useCRTrackingStore();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CRTrackingFormInputs>({
    resolver: zodResolver(crTrackingSchema),
    defaultValues: {
      description: formData?.description || "",
      crType: formData?.crType || undefined,
      stage: formData?.stage || undefined,
      status: formData?.status || undefined,
      startDate: formData?.startDate ? new Date(formData?.startDate) : undefined,
      endDate: formData?.endDate ? new Date(formData?.endDate) : undefined,
      durationInHours: formData?.durationInHours || undefined,
      note: formData?.note || "",
      nil: formData?.nil || undefined,
      change: formData?.change || undefined,
      severity: formData?.severity || undefined,
      family: formData?.family || undefined,
      impactedPersona: formData?.impactedPersona || [],
      impactedProvider: formData?.impactedProvider || [],
      impactedNode: formData?.impactedNode || [],
      owner: formData?.owner || undefined,
      ownerEmail: formData?.ownerEmail || "",
      nominatedDeveloper: formData?.nominatedDeveloper || undefined,
      meetAfterCompletion: formData?.meetAfterCompletion || false,
    },
  });

  const startDate = watch("startDate");

  const onSubmit = (data: CRTrackingFormInputs) => {
    const formattedData = {
      ...data,
      startDate: data.startDate
        ? dayjs(data.startDate).format("YYYY-MM-DD")
        : null,
      endDate: data.endDate ? dayjs(data.endDate).format("YYYY-MM-DD") : null,
      ownerEmail:
        owners.find((o) => o.name === data.owner)?.email || data.ownerEmail,
    };
    // @ts-ignore
    setFormData(formattedData);
    onNext();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 mb-8">
        <FormField
          label="Description"
          required
          errorMessage={errors.description?.message}
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                placeholder="Max characters 160"
                className={`w-full bg-gray-50 border p-4 text-sm rounded-lg ${
                  errors["description"] // Access error using item.name
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                rows={6}
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Change Request Type"
            required
            errorMessage={errors.crType?.message}
          >
            <Controller
              name="crType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.crType ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRTypes?.filter((val) => !!val).map((val, index) => (
                      <SelectItem key={index} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Stage"
            required
            errorMessage={errors.stage?.message}
          >
            <Controller
              name="stage"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.stage ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stageList?.filter((val) => !!val).map((val, index) => (
                      <SelectItem key={index} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="CR Status"
            required
            errorMessage={errors.status?.message}
          >
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.status ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Prospective", "Retrospective"]?.map((val, index) => (
                      <SelectItem key={index} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* ShadcnDatePicker integration for Start Date */}
          <FormField
            label="Start Date"
            required
            errorMessage={errors.startDate?.message}
          >
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  {...field}
                  className={`w-full border p-2 rounded ${
                    errors.startDate ? "border-red-500" : "border-gray-300"
                  }`}
                  min={dayjs(today).format("YYYY-MM-DD")}
                  value={field.value ? dayjs(field.value).format("YYYY-MM-DD") : ""}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value) : undefined;
                    field.onChange(val);
                  }}
                  required
                />
              )}
            />
          </FormField>

          {/* ShadcnDatePicker integration for Due Date */}
            <FormField
            label="Due Date"
            required
            errorMessage={errors.endDate?.message}
            >
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
              <input
                type="date"
                {...field}
                className={`w-full border p-2 rounded ${
                errors.endDate ? "border-red-500" : "border-gray-300"
                }`}
                min={
                startDate
                  ? dayjs(startDate).format("YYYY-MM-DD")
                  : dayjs(today).format("YYYY-MM-DD")
                }
                value={field.value ? dayjs(field.value).format("YYYY-MM-DD") : ""}
                onChange={(e) => {
                const val = e.target.value ? new Date(e.target.value) : undefined;
                field.onChange(val);
                }}
                required
              />
              )}
            />
            </FormField>

          <FormField
            label="Duration in hours"
            required
            errorMessage={errors.durationInHours?.message}
          >
            <Controller
              name="durationInHours"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Duration in hours"
                  variant="outlined"
                  className="h-8 rounded-sm"
                  fullWidth
                  type="number"
                  inputProps={{ min: 0, max: 999 }}
                  value={
                    field.value === null || field.value === undefined
                      ? ""
                      : field.value
                  }
                  onChange={(e) => {
                    const val =
                      e.target.value === "" ? null : Number(e.target.value);
                    field.onChange(val);
                  }}
                  error={!!errors.durationInHours}
                  helperText={errors.durationInHours?.message}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: errors.durationInHours
                          ? "red"
                          : "rgba(0, 0, 0, 0.23)",
                      },
                      "&:hover fieldset": {
                        borderColor: errors.durationInHours
                          ? "red"
                          : "rgba(0, 0, 0, 0.87)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: errors.durationInHours ? "red" : "#1976d2",
                      },
                    },
                  }}
                />
              )}
            />
          </FormField>

          <FormField
            label="Next in line"
            required
            errorMessage={errors.nil?.message}
          >
            <Controller
              name="nil"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => {
                    const target = owners.find((o) => o.name === v);
                    field.onChange(target ? target.name : undefined);
                  }}
                  value={field.value}
                >
                  <SelectTrigger className={errors.nil ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select next in line" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners
                      ?.filter((owner) => !!owner.name)
                      .map((owner, index) => (
                        <SelectItem key={index} value={owner.name}>
                          {owner.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Change"
            required
            errorMessage={errors.change?.message}
          >
            <Controller
              name="change"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.change ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    {changeList?.filter((type) => !!type).map((type, index) => (
                      <SelectItem key={index} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Severity"
            required
            errorMessage={errors.severity?.message}
          >
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.severity ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityList
                      ?.filter((type) => !!type)
                      .map((type, index) => (
                        <SelectItem key={index} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Family"
            required
            errorMessage={errors.family?.message}
          >
            <Controller
              name="family"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.family ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select family" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyList?.filter((type) => !!type).map((type, index) => (
                      <SelectItem key={index} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* CreatableSelect (react-select) remains */}
          <FormField
            label="Impacted Personas"
            required
            errorMessage={errors.impactedPersona?.message}
          >
            <Controller
              name="impactedPersona"
              control={control}
              render={({ field: { onChange, value, ...restField } }) => (
                <CreatableSelect
                  {...restField}
                  isMulti
                  options={personasList?.map((p) => ({
                    value: p.value || "",
                    label: p.label || "",
                  }))}
                  value={value?.map((val) => ({ value: val, label: val }))}
                  onChange={(options) => {
                    const personasArray = options
                      ? options?.map((option: any) => option.value)
                      : [];
                    onChange(personasArray);
                  }}
                  className={`w-full ${errors.impactedPersona ? "border-red-500" : ""}`}
                  classNamePrefix="react-select"
                />
              )}
            />
          </FormField>

          <FormField
            label="Impacted Providers"
            required
            errorMessage={errors.impactedProvider?.message}
          >
            <Controller
              name="impactedProvider"
              control={control}
              render={({ field: { onChange, value, ...restField } }) => (
                <CreatableSelect
                  {...restField}
                  isMulti
                  options={impactedProviders?.map((p) => ({
                    value: p.value || "",
                    label: p.label || "",
                  }))}
                  value={value?.map((val) => ({ value: val, label: val }))}
                  onChange={(options) => {
                    const providersArray = options
                      ? options?.map((option: any) => option.value)
                      : [];
                    onChange(providersArray);
                  }}
                  className={`w-full ${errors.impactedProvider ? "border-red-500" : ""}`}
                  classNamePrefix="react-select"
                />
              )}
            />
          </FormField>

          <FormField
            label="Impacted Nodes"
            required
            errorMessage={errors.impactedNode?.message}
          >
            <Controller
              name="impactedNode"
              control={control}
              render={({ field: { onChange, value, ...restField } }) => (
                <CreatableSelect
                  {...restField}
                  isMulti
                  options={impactedNodes?.map((p) => ({
                    value: p.value || "",
                    label: p.label || "",
                  }))}
                  value={value?.map((val) => ({ value: val, label: val }))}
                  onChange={(options) => {
                    const nodesArray = options
                      ? options?.map((option: any) => option.value)
                      : [];
                    onChange(nodesArray);
                  }}
                  className={`w-full ${errors.impactedNode ? "border-red-500" : ""}`}
                  classNamePrefix="react-select"
                />
              )}
            />
          </FormField>

          <FormField
            label="Owner"
            required
            errorMessage={errors.owner?.message}
          >
            <Controller
              name="owner"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => {
                    const selectedOwner = owners.find((o) => o.name === v);
                    field.onChange(
                      selectedOwner ? selectedOwner.name : undefined
                    );
                    setValue("ownerEmail", selectedOwner?.email || "", {
                      shouldValidate: true,
                    });
                  }}
                  value={field.value}
                >
                  <SelectTrigger
                    className={errors.owner ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners
                      ?.filter((ownerOption) => !!ownerOption.name)
                      .map((ownerOption, index) => (
                        <SelectItem key={index} value={ownerOption.name}>
                          {ownerOption.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <Controller
            name="ownerEmail"
            control={control}
            render={({ field }) => <input type="hidden" {...field} />}
          />

          <FormField
            label="Nominate Developer"
            errorMessage={errors.nominatedDeveloper?.message}
          >
            <Controller
              name="nominatedDeveloper"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => {
                    const target = developers.find((d) => d.name === v);
                    field.onChange(target ? target.name : undefined);
                  }}
                  value={field.value}
                >
                  <SelectTrigger
                    className={
                      errors.nominatedDeveloper ? "border-red-500" : ""
                    }
                  >
                    <SelectValue placeholder="Nominate developer" />
                  </SelectTrigger>
                  <SelectContent>
                    {developers
                      ?.filter((dev) => !!dev.name)
                      .map((dev, index) => (
                        <SelectItem key={index} value={dev.name}>
                          {dev.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        <Controller
          name="meetAfterCompletion"
          control={control}
          render={({ field: { onChange, value, ...restField } }) => (
            <FormControlLabel
              control={
                <Checkbox
                  {...restField}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                />
              }
              label="Dress rehearsals required after implementation"
            />
          )}
        />

        <FormField label="Note" errorMessage={errors.note?.message}>
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                placeholder="Max characters 160"
                className={`w-full bg-gray-50 border p-4 text-sm rounded-lg ${
                  errors["note"] // Access error using item.name
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                rows={6}
              />
            )}
          />
        </FormField>

        <DialogFooter>
          <div className="flex justify-between pt-4 space-x-4">
            <Button
              onClick={onClose}
              type="button"
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              className="px-6 py-2 bg-blue text-white rounded-lg hover:bg-blue disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
            >
              Next
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
};

export default CRTrackingForm;
