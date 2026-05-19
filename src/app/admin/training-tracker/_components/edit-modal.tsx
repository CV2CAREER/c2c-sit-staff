// src/app/_components/edit-modal.jsx
"use client";

import React, {useEffect, useMemo } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import moment from "moment";

// Custom Hook and Schema
import { useTrainingTrackerMutations } from "@/hooks/api/admin/training-tracker";
import {
  trainingTrackerSchema,
  TrainingTrackerData,
  ColumnHeader,
} from "../_schemas/trainingTracker";

export type {
  TrainingTrackerData,
  ColumnHeader,
} from "../_schemas/trainingTracker";

interface EditRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: TrainingTrackerData | null; // The data of the row being edited
  columnHeaders: ColumnHeader[]; // The column definitions from the DataGrid
  activeCoach: any[] | null;
  user: any[];
}

const EditRowModal: React.FC<EditRowModalProps> = ({
  isOpen,
  onClose,
  rowData,
  columnHeaders,
  activeCoach,
  user,
}) => {
  const { updateMutation } = useTrainingTrackerMutations();
  const isLoading = updateMutation.isPending;

  const form = useForm<TrainingTrackerData>({
    resolver: zodResolver(trainingTrackerSchema),
    defaultValues: rowData || undefined, // Set default values from rowData
  });

  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Reset form with new rowData when it changes (e.g., when a different row is selected for editing)
  useEffect(() => {
    if (rowData) {
      reset(rowData);
    }
  }, [rowData, reset]);

  // Watch relevant fields for assessment calculation
  const assessmentFields = useMemo(
    () =>
      [
        "wmtycDecomposition",
        "smeTechnicalDepth",
        "deliverablesQuantification",
        "locationYearroleInTimeExample",
        "selfPronounUsage",
        "businessDeliverables",
        "grammardictioncommunication",
        "personabilitylikeabilityhumor",
        "respectcurtesy",
        "appearance",
      ] as const,
    []
  ); // Use 'as const' for type safety

  const watchedAssessmentValues = useMemo(
    () =>
      assessmentFields.map((field: keyof TrainingTrackerData) => watch(field)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assessmentFields]
  );

  // Calculate assessment whenever relevant fields change
  useEffect(() => {
    let sum = 0;
    watchedAssessmentValues.forEach((field) => {
      sum += Number(field) || 0; // Ensure we handle undefined/null values
    });
    // Update the form value for assessment, but don't re-render the input as it's disabled
    setValue("assessment", sum);
    // eslint-disable-next-line
  }, [watchedAssessmentValues]);

  const onSubmit: SubmitHandler<TrainingTrackerData> = async (data) => {
    try {
      const trackerId = data._id || data.id;
      if (!trackerId) {
        toast.error("Record ID is missing for update.");
        return;
      }
      await updateMutation.mutateAsync({ newRow: data, trackerId });
      onClose();
    } catch {
      // Error handled by hook's toast
    }
  };

  // Define common select options that are used across multiple columns
  const commonSelectOptions = {
    progress: ["in-Flight", "Onboarding", "Pro-Bono", "Prospects"] as const,
    reviewerStatus: [
      "Completed",
      "In-Progress",
      "Not-Required",
      "Not-Reviewed",
    ] as const,
    duration: [30, 60] as const,
    sessionType: ["Feedback", "Interview", "Review", "Screening"] as const,
    surveyVideo: ["NO", "YES"] as const,
    sessionNumber: [1, 2, 3, 4] as const,
    assessmentScores: [0, 1, 2, 3, 4, 5] as const,
    status: ["Completed", "No Show", "Upcoming"] as const,
    reworkType: ["Complete", "Light-Touch", "Nil", "Partial"] as const,
    startTimes: [
      "00.00",
      "00.30",
      "01.00",
      "01.30",
      "02.00",
      "02.30",
      "03.00",
      "03.30",
      "04.00",
      "04.30",
      "05.00",
      "05.30",
      "06.00",
      "06.30",
      "07.00",
      "07.30",
      "08.00",
      "08.30",
      "09.00",
      "09.30",
      "10.00",
      "10.30",
      "11.00",
      "11.30",
      "12.00",
      "12.30",
      "13.00",
      "13.30",
      "14.00",
      "14.30",
      "15.00",
      "15.30",
      "16.00",
      "16.30",
      "17.00",
      "17.30",
      "18.00",
      "18.30",
      "19.00",
      "19.30",
      "20.00",
      "20.30",
      "21.00",
      "21.30",
      "22.00",
      "22.30",
      "23.00",
    ] as const,
  };

  if (!rowData) return null; // Don't render if no rowData

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-career-blue-800 text-[24px] font-bold">
            Edit Training Tracker
          </DialogTitle>
          <DialogDescription>
            Modify the details of the selected training record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full">
          <div className="overflow-y-auto pr-4 max-h-[60vh] w-full custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 w-full gap-6 mb-8">
              {columnHeaders.map((column) => {
                // Skip 'Actions' and internal 'id' fields
                if (
                  column.field === "actions" ||
                  column.field === "id" ||
                  column.field === "_id"
                ) {
                  return null;
                }

                const fieldName = column.field as keyof TrainingTrackerData;
                let inputComponent;

                // Determine the input component based on column type or field name
                switch (fieldName) {
                  case "traineeId":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={field.value as string}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Trainee" />
                            </SelectTrigger>
                            <SelectContent>
                              {user
                                .sort((a: any, b: any) =>
                                  `${a.firstName} ${a.lastName}`.localeCompare(
                                    `${b.firstName} ${b.lastName}`
                                  )
                                )
                                .map((u) => (
                                  <SelectItem key={u._id} value={u._id}>
                                    {`${u.firstName} ${u.lastName}`}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "coachId":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={field.value as string}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Coach" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCoach
                                ?.sort((a, b) =>
                                  a.fullName.localeCompare(b.fullName)
                                )
                                .map((coach) => (
                                  <SelectItem key={coach._id} value={coach._id}>
                                    {coach.fullName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "progress":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={
                              field.value as TrainingTrackerData["progress"]
                            }
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Progress" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.progress.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "reworkType":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={
                              field.value as TrainingTrackerData["reworkType"]
                            }
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Rework Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.reworkType.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "status":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={field.value as TrainingTrackerData["status"]}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.status.map((option, idx) => (
                                <SelectItem key={idx} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "sessionNumber":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={String(field.value)}
                            onValueChange={(val) =>
                              field.onChange(parseInt(val, 10))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Session" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.sessionNumber.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={String(option)}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "duration":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={String(field.value)}
                            onValueChange={(val) =>
                              field.onChange(parseInt(val, 10))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.duration.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={String(option)}>
                                    {option} minutes
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "sessionType":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={
                              field.value as TrainingTrackerData["sessionType"]
                            }
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.sessionType.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "surveyvideo":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={
                              field.value as TrainingTrackerData["surveyvideo"]
                            }
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Option" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.surveyVideo.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "start":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={field.value as TrainingTrackerData["start"]}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Time" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.startTimes.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "assessment":
                    inputComponent = (
                      <Input
                        type="number"
                        value={watch("assessment") || ""}
                        disabled
                        className="w-full bg-gray-50 rounded-lg border border-gray-300"
                      />
                    );
                    break;
                  case "pcAssessment":
                    inputComponent = (
                      <Input
                        type="number"
                        value={watch("pcAssessment") ?? ""}
                        disabled
                        className="w-full bg-gray-50 rounded-lg border border-gray-300"
                      />
                    );
                    break;
                  case "date":
                  case "coachingContact":
                  case "coachingBooking":
                  case "createdAt":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Input
                            type="date"
                            value={
                              field.value
                                ? moment(field.value as string).format(
                                    "YYYY-MM-DD"
                                  )
                                : ""
                            }
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-full bg-gray-50 rounded-lg border border-gray-300"
                          />
                        )}
                      />
                    );
                    break;
                  case "wmtycDecomposition":
                  case "smeTechnicalDepth":
                  case "deliverablesQuantification":
                  case "locationYearroleInTimeExample":
                  case "selfPronounUsage":
                  case "businessDeliverables":
                  case "grammardictioncommunication":
                  case "personabilitylikeabilityhumor":
                  case "respectcurtesy":
                  case "appearance":
                  case "pleasantriessmallTalk":
                  case "sessionObjectives":
                  case "professionIntroduction":
                  case "kpiDescriptionWithExamples":
                  case "cvresumeRendition":
                  case "respectcourtesyempathyhumility":
                  case "kpiCollaborativeScoring":
                  case "recordingAvailabilitySurvey":
                  case "maximumNumberOfQuestions":
                  case "complementingpositiveFeedback":
                  case "clientMultipleGosOnAllQs":
                  case "timeUtilization":
                  case "clientStoryResponses":
                  case "partingQuestions":
                  case "timeKeeping":
                  case "fillerPhrases":
                  case "intermittentClarificationRequest":
                  case "perfectAlternateResponses":
                  case "audiovisualRoomLighteningSetup":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={String(field.value)}
                            onValueChange={(val) =>
                              field.onChange(parseInt(val, 10))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Score" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.assessmentScores.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={String(option)}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "developmentStatus":
                  case "reviewer1":
                  case "reviewer2":
                  case "reviewer3":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <Select
                            value={
                              field.value as TrainingTrackerData["developmentStatus"]
                            }
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonSelectOptions.reviewerStatus.map(
                                (option, idx) => (
                                  <SelectItem key={idx} value={option}>
                                    {option}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    );
                    break;
                  case "overarchingRoleAndIndustryIdentified":
                  case "personalDataGrouping":
                  case "narrativeBasedGroupings":
                  case "professionalSummary":
                  case "technicalSkills":
                  case "softSkills":
                  case "jobDescriptionModification":
                  case "factBasedGroupings":
                  case "businessNameBusinessLocation":
                  case "roleTitle":
                  case "dateFormat":
                  case "educationFormat":
                  case "additionals":
                  case "colourHighlightNewText":
                  case "layoutModification":
                  case "findReplaceAnd":
                  case "paragraphing":
                  case "alignment":
                  case "textSpacing":
                  case "differentiationOfEachRoleTitle":
                  case "roleNarrativeDifferentiation":
                  case "dateSerializationRationalization":
                  case "roleSegmentation":
                  case "grammerreadabilityEase":
                  case "smeTechnicalContent":
                  case "clientRequirementsAssessment":
                  case "dispatchToClient":
                    inputComponent = (
                      <Controller
                        control={control}
                        name={fieldName}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={fieldName}
                              checked={field.value as boolean}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor={fieldName}>
                              {field.value ? "Yes" : "No"}
                            </Label>
                          </div>
                        )}
                      />
                    );
                    break;
                  default:
                    inputComponent = (
                      <Input
                        spellCheck={true}
                        className="w-full bg-gray-50 rounded-lg border border-gray-300"
                        {...form.register(fieldName)} // Use register for simple inputs
                      />
                    );
                    break;
                }

                return (
                  <div key={column.field} className="space-y-2 w-full">
                    <Label
                      htmlFor={column.field}
                      className="block text-lg font-medium text-gray-700"
                    >
                      {column.headerName}{" "}
                      {column.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>
                    {inputComponent}
                    {errors[fieldName] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[fieldName]?.message as string}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex justify-end items-center mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={`px-6 py-2 rounded-lg text-white ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue"
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditRowModal;
