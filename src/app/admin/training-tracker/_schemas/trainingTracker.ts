// src/lib/schemas/trainingTrackerSchema.ts
import { z } from "zod";
import moment from "moment";

// Helper for date validation
const dateStringSchema = z
  .string()
  .refine((val) => moment(val, "YYYY-MM-DD", true).isValid(), {
    message: "Invalid date format, expected YYYY-MM-DD",
  })
  .optional()
  .or(z.literal("")); // Allow empty string or valid date string

// Define the Zod schema for TrainingTrackerData
export const trainingTrackerSchema = z.object({
  _id: z.string().optional(), // Optional for new records
  id: z.string().optional(), // MUI DataGrid might add an 'id' field
  traineeId: z.string().min(1, "Trainee is required"),
  coachId: z.string().min(1, "Coach is required"),
  sessionNumber: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  date: dateStringSchema.or(z.string().min(1, "Date is required")), // Date is required
  status: z.union([
    z.literal("Completed"),
    z.literal("Upcoming"),
    z.literal("No Show"),
    z.literal("Pending"),
    z.literal("In Progress"),
    z.literal("Cancelled"),
  ]).optional(),
  notes: z.string().optional().or(z.literal("")),
  progress: z.union([
    z.literal("Pro-Bono"),
    z.literal("Prospects"),
    z.literal("Onboarding"),
    z.literal("in-Flight"),
  ]).optional(),
  reworkType: z.union([
    z.literal("Light-Touch"),
    z.literal("Partial"),
    z.literal("Complete"),
    z.literal("Nil"),
  ]).optional(),
  preferredCraft: z.string().optional().or(z.literal("")).optional(),
  undergrad: z.string().optional().or(z.literal("")).optional(),
  postgrad: z.string().optional().or(z.literal("")).optional(),
  training: z.string().optional().or(z.literal("").optional()),
  experience: z.string().optional().or(z.literal("")).optional(),
  createdAt: dateStringSchema.optional(), // Date string, optional for editing
  overarchingRoleAndIndustryIdentified: z.boolean().optional(),
  personalDataGrouping: z.boolean().optional(),
  narrativeBasedGroupings: z.boolean().optional(),
  professionalSummary: z.boolean().optional(),
  technicalSkills: z.boolean().optional(),
  softSkills: z.boolean().optional(),
  jobDescriptionModification: z.boolean().optional(),
  factBasedGroupings: z.boolean().optional(),
  businessNameBusinessLocation: z.boolean().optional(),
  roleTitle: z.boolean().optional(),
  dateFormat: z.boolean().optional(),
  educationFormat: z.boolean().optional(),
  additionals: z.boolean().optional(),
  colourHighlightNewText: z.boolean().optional(),
  layoutModification: z.boolean().optional(),
  findReplaceAnd: z.boolean().optional(),
  paragraphing: z.boolean().optional(),
  alignment: z.boolean().optional(),
  textSpacing: z.boolean().optional(),
  differentiationOfEachRoleTitle: z.boolean().optional(),
  roleNarrativeDifferentiation: z.boolean().optional(),
  dateSerializationRationalization: z.boolean().optional(),
  roleSegmentation: z.boolean().optional(),
  developmentStatus: z.union([
    z.literal("Completed"),
    z.literal("In-Progress"),
    z.literal("Not-Reviewed"),
    z.literal("Not-Required"),
  ]).optional(),
  reviewer1: z.union([
    z.literal("Completed"),
    z.literal("In-Progress"),
    z.literal("Not-Reviewed"),
    z.literal("Not-Required"),
  ]).optional(),
  grammerreadabilityEase: z.boolean().optional(),
  smeTechnicalContent: z.boolean().optional(),
  reviewer2: z.union([
    z.literal("Completed"),
    z.literal("In-Progress"),
    z.literal("Not-Reviewed"),
    z.literal("Not-Required"),
  ]).optional(),
  clientRequirementsAssessment: z.boolean().optional(),
  reviewer3: z.union([
    z.literal("Completed"),
    z.literal("In-Progress"),
    z.literal("Not-Reviewed"),
    z.literal("Not-Required"),
  ]).optional(),
  dispatchToClient: z.boolean().optional(),
  coachingContact: dateStringSchema.optional().or(z.literal("")).optional(), // Date string
  coachingBooking: dateStringSchema.optional().or(z.literal("")).optional(), // Date string
  start: z.string().optional().or(z.literal("")).optional(), // Time string like 'HH.MM'
  duration: z.union([z.literal(30), z.literal(60)]).optional(),
  sessionType: z.union([
    z.literal("Screening"),
    z.literal("Interview"),
    z.literal("Review"),
    z.literal("Feedback"),
  ]).optional(),
  surveyvideo: z.union([z.literal("YES"), z.literal("NO")]).optional(),
  wmtycDecomposition: z.number().min(0).max(5).optional(),
  smeTechnicalDepth: z.number().min(0).max(5).optional(),
  deliverablesQuantification: z.number().min(0).max(5).optional(),
  locationYearroleInTimeExample: z.number().min(0).max(5).optional(),
  selfPronounUsage: z.number().min(0).max(5).optional(),
  businessDeliverables: z.number().min(0).max(5).optional(),
  grammardictioncommunication: z.number().min(0).max(5).optional(),
  personabilitylikeabilityhumor: z.number().min(0).max(5).optional(),
  respectcurtesy: z.number().min(0).max(5).optional(),
  appearance: z.number().min(0).max(5).optional(),
  assessment: z.number().optional(), // Calculated field, not directly validated by form
  pcAssessment: z.string().optional().or(z.literal("")),
  pleasantriessmallTalk: z.number().min(0).max(5).optional(),
  sessionObjectives: z.number().min(0).max(5).optional(),
  professionIntroduction: z.number().min(0).max(5).optional(),
  kpiDescriptionWithExamples: z.number().min(0).max(5).optional(),
  cvresumeRendition: z.number().min(0).max(5).optional(),
  respectcourtesyempathyhumility: z.number().min(0).max(5).optional(),
  kpiCollaborativeScoring: z.number().min(0).max(5).optional(),
  recordingAvailabilitySurvey: z.number().min(0).max(5).optional(),
  maximumNumberOfQuestions: z.number().min(0).max(5).optional(),
  complementingpositiveFeedback: z.number().min(0).max(5).optional(),
  clientMultipleGosOnAllQs: z.number().min(0).max(5).optional(),
  timeUtilization: z.number().min(0).max(5).optional(),
  clientStoryResponses: z.number().min(0).max(5).optional(),
  partingQuestions: z.number().min(0).max(5).optional(),
  timeKeeping: z.number().min(0).max(5).optional(),
  fillerPhrases: z.number().min(0).max(5).optional(),
  intermittentClarificationRequest: z.number().min(0).max(5).optional(),
  perfectAlternateResponses: z.number().min(0).max(5).optional(),
  audiovisualRoomLighteningSetup: z.number().min(0).max(5).optional(),
});

// Export the inferred type for convenience
export type TrainingTrackerData = z.infer<typeof trainingTrackerSchema>;

// Simplified interface for column definitions from DataGrid
export interface ColumnHeader {
  field: keyof TrainingTrackerData | "actions"; // 'actions' is a special field
  headerName: string;
  type?:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "dateTime"
    | "singleSelect"
    | "actions";
  valueOptions?: (string | number)[]; // For select options
  required?: boolean;
  editable?: boolean;
}
