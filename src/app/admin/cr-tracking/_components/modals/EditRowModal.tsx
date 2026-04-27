/* eslint-disable @typescript-eslint/ban-ts-comment */
// components/modals/EditRowModal.tsx
"use client";
import React, { useEffect, useState } from "react";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { useCRTrackingQueries, useCRTrackingMutations } from "@/hooks/api/admin/cr-tracking";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { toast } from "react-hot-toast";
import CreatableSelect from "react-select/creatable";
import ReactDOM from "react-dom";

// Shadcn UI Components
import { Dialog, DialogContent } from "@/components/ui/dialog"; // Assuming Dialog is the parent
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TextField, FormControlLabel, Checkbox } from "@mui/material"; // Keeping MUI components for inputNumber and Checkbox for now, replace with Shadcn if available

// Custom Components / Utils
import HistoryLogModal from "./HistoryLogModal"; // Adjust path if necessary
import Spinner from "@/components/ui/spinner";
import { transformCrOptions } from "@/utils/crTracking"; // Adjust path if necessary
import { OptionsResponse } from "./create-modal/content";
import { editCrTrackingSchema } from "@/utils/zodSchemas";
import ImageUploadSectionUpdated from "../forms/image-upload-section-new";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Infer the TypeScript type from the Zod schema
type EditCRTrackingFormInputs = z.infer<typeof editCrTrackingSchema>;

// --- Type Definitions for Props and Data ---
export interface RowData {
  _id: string;
  id: string; // Custom ID
  description: string;
  crType: string;
  stage: string;
  status: string; // Changed from crStatus to status to match schema
  startDate: string; // From backend, will be converted to Date object for form
  endDate: string; // From backend, will be converted to Date object for form
  durationInHours: number | null;
  NIL: string; // Next in line
  nilEmail?: string;
  changeType: string; // Corrected from 'change' to 'changeType'
  severity: string;
  family: string;
  impactedPersona: string | string[]; // Can be string (semicolon-separated) or string[]
  impactedProvider: string | string[];
  impactedNode: string | string[];
  owner: string; // Owner's name
  ownerEmail?: string;
  nominatedDeveloper?: string; // Developer's name
  nominatedDeveloperEmail?: string;
  meetAfterCompletion: boolean;
  note?: string;
  currentState?: string;
  futureState?: string;
  context?: string;
  businessImpact?: string;
  currentStateImageURLs?: string | string[]; // Can be string (comma-separated) or string[]
  futureStateImageURLs?: string | string[]; // Can be string (comma-separated) or string[]
  createdBy: string;
  createdAt: string;
  noteTrail?: { addedBy: string; addedAt: string; note: string }[];
  // Add any other fields that are part of your rowData
}

interface EditRowModalProps {
  rowData: RowData | null;
  onClose: () => void;
  refetch: () => void;
  isOpen?: boolean;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  errorMessage?: string; // Added for react-hook-form error messages
  hideLabel?: boolean; // New prop to conditionally hide FormField's label
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  children,
  errorMessage,
  hideLabel = false,
}) => (
  <div className="space-y-1">
    {!hideLabel && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    {children}
    {errorMessage && <p className="text-red-500 text-xs">{errorMessage}</p>}
  </div>
);

const EditRowModal: React.FC<EditRowModalProps> = ({
  rowData,
  onClose,
  isOpen,
  refetch,
}) => {
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isHistoryLogModalOpen, setIsHistoryLogModalOpen] = useState(false);
  const [crLogs, setCrLogs] = useState<any[]>([]); // Define a type for crLogs if possible
  const [crLogPage, setCrLogPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentStateImageURLs, setCurrentStateImageURLs] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [futureStateImageURLs, setFutureStateImageURLs] = useState<string[]>([]);

  const { crOptionsDomain } = useCRTrackingQueries({
    fetchCRTrackingOptions: true,
  });

  const { updateMutation } = useCRTrackingMutations();

  const data = crOptionsDomain.data as OptionsResponse | undefined;
  const isLoading = crOptionsDomain.isLoading;

  const impactedProviders = data?.allCRImpactedProvidersData || [];
  const impactedNodes = data?.allCRImpactedNodesData || [];
  const personas = data?.allCRImpactedPersonasData || [];
  const severities = data?.allCRSeveritiesData || [];
  const types = transformCrOptions(data?.allCRTypesData) || [];
  const families = transformCrOptions(data?.allCRFamiliesData) || [];
  const stages = transformCrOptions(data?.allCRStagesData) || [];
  const owners = data?.allCROwnersData || [];
  const changes = transformCrOptions(data?.allCRChangesData) || [];

  const developers = owners.filter(
    (r) => r.role?.toLowerCase() === "developer"
  );

  // React Hook Form Initialization
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditCRTrackingFormInputs>({
    resolver: zodResolver(editCrTrackingSchema) as any,
    defaultValues: {
      _id: rowData?._id,
      id: rowData?.id,
      description: rowData?.description || "",
      crType: rowData?.crType || undefined,
      stage: rowData?.stage || undefined,
      status: rowData?.status || undefined, // Matches schema 'status'
      startDate: rowData?.startDate
        ? dayjs(rowData?.startDate).toDate()
        : undefined,
      endDate: rowData?.endDate ? dayjs(rowData?.endDate).toDate() : undefined,
      durationInHours: rowData?.durationInHours ?? null,
      NIL: rowData?.NIL || undefined,
      nilEmail: rowData?.nilEmail || "",
      changeType: rowData?.changeType || undefined,
      severity: rowData?.severity || undefined,
      family: rowData?.family || undefined,
      impactedPersona: Array.isArray(rowData?.impactedPersona)
        ? rowData?.impactedPersona
        : rowData?.impactedPersona
          ? rowData?.impactedPersona.split("; ")
          : [],
      impactedProvider: Array.isArray(rowData?.impactedProvider)
        ? rowData?.impactedProvider
        : rowData?.impactedProvider
          ? rowData?.impactedProvider.split("; ")
          : [],
      impactedNode: Array.isArray(rowData?.impactedNode)
        ? rowData?.impactedNode
        : rowData?.impactedNode
          ? rowData?.impactedNode.split("; ")
          : [],
      owner: rowData?.owner || undefined,
      ownerEmail: rowData?.ownerEmail || "",
      nominatedDeveloper: rowData?.nominatedDeveloper || undefined,
      nominatedDeveloperEmail: rowData?.nominatedDeveloperEmail || "",
      meetAfterCompletion: rowData?.meetAfterCompletion,
      note: rowData?.note || "",
      currentState: rowData?.currentState || "",
      futureState: rowData?.futureState || "",
      context: rowData?.context || "",
      businessImpact: rowData?.businessImpact || "",
      currentStateImageURLs: Array.isArray(rowData?.currentStateImageURLs)
        ? rowData?.currentStateImageURLs
        : rowData?.currentStateImageURLs
          ? rowData?.currentStateImageURLs.split(", ")
          : [],
      futureStateImageURLs: Array.isArray(rowData?.futureStateImageURLs)
        ? rowData?.futureStateImageURLs
        : rowData?.futureStateImageURLs
          ? rowData?.futureStateImageURLs.split(", ")
          : [],
      createdBy: rowData?.createdBy,
      createdAt: rowData?.createdAt,
      noteTrail: rowData?.noteTrail || [],
    },
  });

  const startDate = watch("startDate");
  const formValues = watch(); // Watch all form values for image URLs



  useEffect(() => {
    const fetchHistoryLog = async () => {
      try {
        setIsLogsLoading(true);
        const res = await axiosInstance.get(
          `${endpoints.ADMIN_CR_TRACKING_HISTORY}?customId=${rowData?.id}&id=${rowData?._id}&page=${crLogPage}`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = res.data?.data as any;
        setCrLogs(payload?.data || []);
        setHasNextPage(Boolean(payload?.hasNextPage));
        setHasPrevPage(Boolean(payload?.hasPrevPage));
        setTotalLogs(Number(payload?.totalCrHistoryLog || 0));
      } catch{
        toast.error("Failed to fetch history logs.");
      } finally {
        setIsLogsLoading(false);
      }
    };
    fetchHistoryLog();
  }, [crLogPage, rowData?.id, rowData?._id]);

  const onSubmit = async (
    data: EditCRTrackingFormInputs,
    notify: boolean = false
  ) => {
    setIsEditSaving(true);
    try {
      // Manual date validation that Zod might not catch with `isSameOrAfter` directly
      if (
        data.endDate &&
        data.startDate &&
        dayjs(data.endDate).isSameOrBefore(dayjs(data.startDate), "day")
      ) {
        toast.error("Due date must be after the start date.");
        setIsEditSaving(false);
        return;
      }

      const dataToSave = {
        ...data,
        startDate: data.startDate
          ? dayjs(data.startDate).format("YYYY-MM-DD")
          : null,
        endDate: data.endDate ? dayjs(data.endDate).format("YYYY-MM-DD") : null,
        impactedPersona: data.impactedPersona.join("; "),
        impactedProvider: data.impactedProvider.join("; "),
        impactedNode: data.impactedNode.join("; "),
        currentStateImageURLs: data.currentStateImageURLs?.join(", ") || "",
        futureStateImageURLs: data.futureStateImageURLs?.join(", ") || "",
        // Ensure that ownerEmail and nilEmail are correctly picked up from selected options
        ownerEmail:
          owners.find((o) => o.name === data.owner)?.email ||
          data.ownerEmail ||
          "",
        nilEmail:
          owners.find((o) => o.name === data.NIL)?.email || data.nilEmail || "",
        nominatedDeveloperEmail:
          developers.find((d) => d.name === data.nominatedDeveloper)?.email ||
          data.nominatedDeveloperEmail ||
          "",
        notify, // Pass the notify flag to the save handler
      };

      updateMutation.mutate(dataToSave, {
        onSuccess: () => {
          toast.success(
            notify
              ? "Change Request saved and NIL notified!"
              : "Change Request saved successfully!"
          );
          onClose(); // Close the modal on successful save
          refetch(); // Trigger list refresh
        },
        onError: (error: any) => {
          toast.error(error?.message || "Failed to save Change Request.");
        },
      });
    } catch {
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setIsEditSaving(false);
    }
  };



  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    stateType: 'current' | 'future',
  ) => {
    setIsUploading(true);
    const files = event.target.files;
    if (files && files.length > 0) {
      const uploadPromises = Array.from(files).map((file) => {
        const formData = new FormData();
        formData.append('file', file);
        return axiosInstance.post(endpoints.ADMIN_CR_TRACKING_DOCUMENT_UPLOAD, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });

      try {
        const responses = await Promise.all(uploadPromises);
        const fileUrls = responses.map((response) => response.data.data[0].file.fileUrl);

        if (stateType === 'current') {
          setCurrentStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        } else {
          setFutureStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        }

        toast.success('Files uploaded successfully');
      } catch {
        toast.error('Failed to upload files');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleGoogleDriveUpload = async (files: any[], stateType: 'current' | 'future') => {
    setIsUploading(true);
    try {
      const fileUrls = files.map((file) => file.webViewLink || file.embedUrl);

      if (stateType === 'current') {
        setCurrentStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
      } else {
        setFutureStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
      }

      toast.success('Files selected successfully from Google Drive');
    } catch {
      toast.error('Failed to select files from Google Drive');
    } finally {
      setIsUploading(false);
    }
  };  

  const handleCloudUpload = async (service: string, stateType: 'current' | 'future') => {
    setIsUploading(true);
    try {
      const fileUrls = await openCloudFilePicker(service);

      if (fileUrls && fileUrls.length > 0) {
        if (stateType === 'current') {
          setCurrentStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        } else {
          setFutureStateImageURLs((prevUrls) => [...prevUrls, ...fileUrls]);
        }

        toast.success(`Files selected successfully from ${service}`);
      }
    } catch {
      toast.error(`Failed to select files from ${service}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (url: string) => {
    await axiosInstance.delete(endpoints.ADMIN_CR_TRACKING_DOCUMENT_UPLOAD, { data: { url } });
  };

  const openCloudFilePicker = (service: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const windowFeatures = `width=${width},height=${height},left=${left},top=${top}`;

      const popup = window.open(
        `/api/cloud-picker?service=${service}`,
        'CloudFilePicker',
        windowFeatures,
      );

      window.addEventListener(
        'message',
        function (event) {
          if (event.origin === window.location.origin) {
            if (event.data.type === 'cloudFiles') {
              resolve(event.data.files);
              popup?.close();
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.message));
              popup?.close();
            }
          }
        },
        false,
      );
    });
  };  

  const handleUrlUpload = async (stateType: 'current' | 'future') => {
    if (!urlInput) {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsAddingUrl(true);

    try {
      const response = await axiosInstance.post(
        endpoints.ADMIN_CR_TRACKING_VALIDATE_URL,
        { url: urlInput },
      );

      if (response.data?.message === 'URL is a valid image') {
        if (stateType === 'current') {
          setCurrentStateImageURLs((prevUrls) => [...prevUrls, urlInput]);
        } else {
          setFutureStateImageURLs((prevUrls) => [...prevUrls, urlInput]);
        }
        setUrlInput('');
        toast.success('Image URL added successfully');
      } else {
        toast.error('Invalid image URL');
      }
    } catch {
      toast.error("Failed to add URL. Please ensure it's a valid image URL.");
    } finally {
      setIsAddingUrl(false);
    }
  };

  if (isLoading) return <Spinner size="h-72" />;

  // Get today's date for date picker min date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[90vw] md:min-w-[60vw] lg:min-w-[50vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => setIsHistoryLogModalOpen(true)}
            className="bg-blue text-white p-2 rounded-lg w-40 text-center hover:bg-career-blue-700"
          >
            View History Log
          </Button>
          <h2 className="text-2xl font-semibold text-blue">
            Edit Change Request
          </h2>
        </div>

        <form
          onSubmit={handleSubmit((data) => onSubmit(data as unknown as EditCRTrackingFormInputs, false))}
          className="space-y-6 mb-8"
        >
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
                  maxLength={160}
                  className={`w-full bg-gray-50 rounded-lg focus:ring-0 focus:ring-career-blue-500 focus:border-career-blue-500 border p-4 text-gray-900 text-sm transition duration-200 ease-in-out ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                  rows={4}
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
                      {types.map((type:any, index:number) => (
                        <SelectItem key={index} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Created By">
              <p className="border rounded-md py-2 px-3 w-full text-sm flex items-center bg-gray-100 text-gray-700 h-10">
                {rowData?.createdBy}
              </p>
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
                      {stages.map((type:any, index:number) => (
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
                      {["Prospective", "Retrospective"].map((val, index) => (
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
              label="Start Date"
              required
              hideLabel
              errorMessage={errors.startDate?.message}
            >
              <Controller
                name="startDate"
                control={control}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                render={({ field: { onChange, value, ...restField } }) => (
                  // <ShadcnDatePicker
                  //   label="Start Date"
                  //   value={value}
                  //   onChange={onChange}
                  //   error={!!errors.startDate}
                  //   helperText={errors.startDate?.message}
                  //   required
                  //   fromDate={today}
                  //   {...restField}
                  // />
                  <input
                    type="date"
                    className={`w-full border p-2 rounded ${
                      errors.startDate ? "border-red-500" : "border-gray-300"
                    }`}
                    min={dayjs(today).format("YYYY-MM-DD")}
                    value={value ? dayjs(value).format("YYYY-MM-DD") : ""}
                    onChange={(e) => {
                      const val = e.target.value ? new Date(e.target.value) : undefined;
                      onChange(val);
                    }}
                    required
                  />
                )}
              />
            </FormField>

            <FormField
              label="Due Date"
              required
              hideLabel
              errorMessage={errors.endDate?.message}
            >
              <Controller
                name="endDate"
                control={control}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                render={({ field: { onChange, value, ...restField } }) => (
                  // <ShadcnDatePicker
                  //   label="Due Date"
                  //   value={value}
                  //   onChange={onChange}
                  //   shouldDisableDate={(current: Date) =>
                  //     startDate
                  //       ? dayjs(current).isBefore(dayjs(startDate), "day")
                  //       : false
                  //   }
                  //   error={!!errors.endDate}
                  //   helperText={errors.endDate?.message}
                  //   fromDate={today}
                  //   required
                  //   {...restField}
                  // />
                  <input
                    type="date"
                    className={`w-full border p-2 rounded ${
                    errors.endDate ? "border-red-500" : "border-gray-300"
                    }`}
                    min={
                    startDate
                      ? dayjs(startDate).format("YYYY-MM-DD")
                      : dayjs(today).format("YYYY-MM-DD")
                    }
                    value={value ? dayjs(value).format("YYYY-MM-DD") : ""}
                    onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value) : undefined;
                    onChange(val);
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
                          borderColor: errors.durationInHours
                            ? "red"
                            : "#1976d2",
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
              errorMessage={errors.NIL?.message}
            >
              <Controller
                name="NIL"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => {
                      const target = owners.find((eo) => eo.name === v);
                      field.onChange(target ? target.name : undefined);
                      setValue("nilEmail", target?.email || "", {
                        shouldValidate: true,
                      });
                    }}
                    value={field.value}
                  >
                    <SelectTrigger
                      className={errors.NIL ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select next in line" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner, index) => (
                        <SelectItem key={index} value={owner.name}>
                          {owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {/* Hidden input for nilEmail */}
            <Controller
              name="nilEmail"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />

            <FormField
              label="Change"
              required
              errorMessage={errors.changeType?.message}
            >
              <Controller
                name="changeType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={errors.changeType ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select change type" />
                    </SelectTrigger>
                    <SelectContent>
                      {changes.map((type:any, index:number) => (
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
                      {severities.map((type, index) => (
                        <SelectItem key={index} value={type.name}>
                          {type.name}
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
                      {families.map((type:any, index:number) => (
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
                    options={personas.map((p) => ({
                      value: p.value || p.label || p.name || "",
                      label: p.label || p.name || p.value || "",
                    }))}
                    value={value?.map((val:any) => ({ value: val, label: val }))}
                    onChange={(options) => {
                      const personasArray = options
                        ? options.map((option:any) => option.value)
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
                    options={impactedProviders.map((p) => ({
                      value: p.value || p.label || p.name || "",
                      label: p.label || p.name || p.value || "",
                    }))}
                    value={value?.map((val:any) => ({ value: val, label: val }))}
                    onChange={(options) => {
                      const providersArray = options
                        ? options.map((option) => option.value)
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
                    options={impactedNodes.map((p) => ({
                      value: p.value || p.label || p.name || "",
                      label: p.label || p.name || p.value || "",
                    }))}
                    value={value?.map((val:any) => ({ value: val, label: val }))}
                    onChange={(options) => {
                      const nodesArray = options
                        ? options.map((option) => option.value)
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
                      {owners.map((ownerOption, index) => (
                        <SelectItem key={index} value={ownerOption.name}>
                          {ownerOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {/* Hidden input for ownerEmail */}
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
                      setValue("nominatedDeveloperEmail", target?.email || "", {
                        shouldValidate: true,
                      });
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
                      {developers.map((dev, index) => (
                        <SelectItem key={index} value={dev.name}>
                          {dev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {/* Hidden input for nominatedDeveloperEmail */}
            <Controller
              name="nominatedDeveloperEmail"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />
          </div>

          {["currentState", "futureState", "context", "businessImpact"].map(
            (field) => (
              <div key={field} className="space-y-2">
                <label className="block text-lg font-medium text-gray-700">
                  {field.charAt(0).toUpperCase() +
                    field.slice(1).replace(/([A-Z])/g, " $1")}
                </label>
                <Controller
                  name={
                    field as
                      | "currentState"
                      | "futureState"
                      | "context"
                      | "businessImpact"
                  }
                  control={control}
                  render={({ field: controllerField }) => (
                    <textarea
                      {...controllerField}
                      placeholder="Start typing..."
                      className={`w-full bg-gray-50 rounded-lg focus:ring-0 focus:ring-career-blue-500 focus:border-career-blue-500 border p-4 text-gray-900 text-sm transition duration-200 ease-in-out ${
                        errors[field as keyof EditCRTrackingFormInputs]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      rows={6}
                    />
                  )}
                />

                {(field === "currentState" || field === "futureState") && (
                  <div className="mt-4 space-y-4">
                    <ImageUploadSectionUpdated
                      stateType={field === 'currentState' ? 'current' : 'future'}
                      handleFileUpload={handleFileUpload}
                      handleCloudUpload={handleCloudUpload}
                      handleUrlUpload={handleUrlUpload}
                      urlInput={urlInput}
                      setUrlInput={setUrlInput}
                      isAddingUrl={isAddingUrl}
                      imageURLs={formValues[`${field}ImageURLs`] as string[]}
                      isUploading={isUploading}
                      handleGoogleDriveUpload={handleGoogleDriveUpload}
                      setImageUrls={(urls: string[]) => {
                        setValue(`${field}ImageURLs` as any, urls, { shouldDirty: true });
                      }}
                      handleFileDelete={handleFileDelete}
                    />
                  </div>
                )}
              </div>
            )
          )}

          <div className="space-y-2">
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
                    maxLength={160}
                    className={`w-full bg-gray-50 rounded-lg focus:ring-0 focus:ring-career-blue-500 focus:border-career-blue-500 border p-4 text-gray-900 text-sm transition duration-200 ease-in-out ${
                      errors.note ? "border-red-500" : "border-gray-300"
                    }`}
                    rows={4}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-700">Note Trail</h3>
            <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar p-2">
              {rowData?.noteTrail && rowData?.noteTrail.length > 0 ? (
                rowData?.noteTrail.map((note, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-300 rounded-lg bg-gray-50"
                  >
                    <p className="text-gray-800">
                      <strong>{note.addedBy}</strong> -{" "}
                      <span className="text-gray-500">
                        {new Date(note.addedAt).toLocaleString()}
                      </span>
                    </p>
                    <p className="text-gray-700">{note.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No notes available.</p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-8 space-x-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={isEditSaving}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              Cancel
            </Button>

            <Button
              type="button" // This button should be type="button" to prevent form submission
              disabled={isEditSaving}
              onClick={handleSubmit((data) => onSubmit(data as unknown as EditCRTrackingFormInputs, true))}
              className="px-6 py-2 disabled:bg-gray-200 disabled:cursor-not-allowed bg-blue text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50"
            >
              {isEditSaving
                ? "Saving and Notifying NIL..."
                : "Save & Notify NIL"}
            </Button>

            <Button
              type="submit" // This button submits the form without notifying NIL
              disabled={isEditSaving}
              className="px-6 py-2 disabled:bg-gray-200 disabled:cursor-not-allowed bg-blue text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50"
            >
              {isEditSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {isHistoryLogModalOpen &&
        ReactDOM.createPortal(
          <HistoryLogModal
            isHistoryLogModalOpen={isHistoryLogModalOpen}
            setIsHistoryLogModalOpen={setIsHistoryLogModalOpen}
            crLogs={crLogs}
            crLogPage={crLogPage}
            setCrLogPage={setCrLogPage}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            totalLogs={totalLogs}
            isLogsLoading={isLogsLoading}
          />,
          document.body
        )}
    </Dialog>
  );
};

export default EditRowModal;
