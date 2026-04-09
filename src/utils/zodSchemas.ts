import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js";
import dayjs from "dayjs";

export const RegisterSchema = z
  .object({
    firstName: z
      .string()
      .min(2, {
        message: "Must be at least 2 characters.",
      })
      .max(50, {
        message: "Must be less than 50 characters.",
      }),
    middleName: z.string().optional(),
    lastName: z
      .string()
      .min(2, {
        message: "Must be at least 2 characters.",
      })
      .max(50, {
        message: "Must be less than 50 characters.",
      }),
    email: z.string().email({
      message: "Email Required.",
    }),
    gender: z.enum(["Male", "Female", "Prefer not to Say"]).optional(),
    voiceNumber: z.string().refine(
      (value) => {
        try {
          parsePhoneNumber(value);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Invalid phone number",
      }
    ),
    whatsappNumber: z.string().refine(
      (value) => {
        try {
          parsePhoneNumber(value);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Invalid number",
      }
    ),
    country: z.string().min(2, {
      message: "Required",
    }),
    currentCity: z.string().min(2, {
      message: "Required",
    }),
    referrer: z.string().optional(),
    promotionCode: z.string().optional(),
    password: z.string().min(8, {
      message: "Must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Must be at least 8 characters.",
    }),
    agreeToTerms: z
      .boolean({
        message: "You need to accept the terms and conditions",
      })
      .refine((value) => value === true, {
        message: "You need to accept the terms and conditions",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const LoginSchema = z.object({
  email: z.string().email({
    message: "Email Required.",
  }),
  password: z
    .string()
    .min(8, {
      message: "Must be at least 8 characters.",
    })
    .max(32, {
      message: "Must be less than 32 characters.",
    }),
});

export const EditProfileFormSchema = z
  .object({
    firstName: z
      .string()
      .min(2, {
        message: "Must be at least 2 characters.",
      })
      .max(50, {
        message: "Must be less than 50 characters.",
      }),
    middleName: z.string().optional(),
    lastName: z
      .string()
      .min(2, {
        message: "Must be at least 2 characters.",
      })
      .max(50, {
        message: "Must be less than 50 characters.",
      }),
    voiceNumber: z.string().optional(),
    // voiceNumber: z.string().refine(
    //   (value) => {
    //     try {
    //       parsePhoneNumber(value);
    //       return true;
    //     } catch (error) {
    //       return false;
    //     }
    //   },
    //   {
    //     message: "Invalid phone number",
    //   }
    // ),
    password: z
      .string()
      .min(8, { message: "Must be at least 8 characters." })
      .optional()
      .or(z.literal("")),
    confirmPassword: z
      .string()
      .min(8, { message: "Must be at least 8 characters." })
      .optional()
      .or(z.literal("")),
    country: z.string().min(2, {
      message: "Required",
    }),
    bankName: z.string().optional(),
    bsb: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    accountName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Job Preference Step 01 Schema
export const JobPrefStep01Schema = z.object({
  role: z.string().min(1, "Enter your role"),
  titles: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .min(1, "Select at least one role title to include"),
  titlesExcluded: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  keywords: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  keywordsExcluded: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  country: z.object({ value: z.string(), label: z.string() }),
  statesInclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .min(1, "Select at least one state/territory/province to include"),
  statesExclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  citiesInclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  citiesExclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
});

// Job Preference Step 02 Schema
export const JobPrefStep02Schema = z.object({
  advertisersInclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  advertisersExclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  industriesInclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  industriesExclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  jobTypes: z.array(z.string()).min(1, "Select at least one job type"),
  salaryType: z.enum(["Hourly", "Monthly", "Annually"], {
    message: "Select a salary type",
  }),
  minSalary: z.object({ value: z.string(), label: z.string() }),
  maxSalary: z.object({ value: z.string(), label: z.string() }),
  classificationsInclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  classificationsExclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
});

// Job Preference Step 03 Schema
export const JobPrefStep03Schema = z.object({
  bodyInclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  bodyExclude: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  workRights: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  clientComments: z.string().optional(),
  cvVariation: z.enum(["yes", "no"], { message: "Select yes or no" }),
  aiConsent: z.enum(["yes", "no"], { message: "Select yes or no" }),
  includeCoverLetter: z.boolean().optional(),
});

// Job Preference Step 04 Schema
export const JobPrefStep04Schema = z.object({
  jobsiteCredentials: z.record(
    z.string(),
    z.object({
      username: z.string().min(1, "Enter username"),
      password: z.string().min(1, "Enter password"),
      verified: z.boolean(),
    })
  ),
});

export const crTrackingSchema = z
  .object({
    description: z
      .string()
      .min(1, "Description is required")
      .max(160, "Description must not exceed 160 characters"),
    crType: z.string().min(1, "Change Request Type is required"),
    stage: z.string().min(1, "Stage is required"),
    status: z.string().min(1, "CR Status is required"),

    // startDate and endDate are now only validated for being valid Dayjs objects and not null
    startDate: z.date({ message: "Start Date is required" }),
    endDate: z.date({
      message: "Due Date is required",
    }),

    durationInHours: z
      .number({ message: "Duration in hours is required" })
      .min(0, "Duration must be a positive number")
      .max(999, "Duration must not exceed 999 hours"),
    note: z
      .string()
      .max(160, "Note must not exceed 160 characters")
      .optional()
      .or(z.literal("")),

    nil: z.string().min(1, "Next in Line is required"),
    change: z.string().min(1, "Change type is required"),
    severity: z.string().min(1, "Severity is required"),
    family: z.string().min(1, "Family is required"),
    impactedPersona: z
      .array(z.string())
      .min(1, "At least one Impacted Persona is required"),
    impactedProvider: z
      .array(z.string())
      .min(1, "At least one Impacted Provider is required"),
    impactedNode: z
      .array(z.string())
      .min(1, "At least one Impacted Node is required"),
    owner: z.string().min(1, "Owner is required"),
    ownerEmail: z.string().email("Invalid email format"),
    nominatedDeveloper: z.string().optional().or(z.literal("")),
    meetAfterCompletion: z.boolean(),
  })
  // Add a superRefine to the entire object for cross-field validation
  .superRefine((data, ctx) => {
    // Only perform comparison if both dates are present and valid Dayjs objects
    if (
      data.startDate &&
      data.endDate &&
      dayjs.isDayjs(data.startDate) &&
      dayjs.isDayjs(data.endDate)
    ) {
      if (data.endDate.isBefore(data.startDate, "day")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Due Date must be on or after Start Date",
          path: ["endDate"], // Associate the error with the 'endDate' field
        });
      }
    }
  });

export const editCrTrackingSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required.")
    .max(160, "Description cannot exceed 160 characters."),
  crType: z.string().min(1, "Change Request Type is required."),
  stage: z.string().min(1, "Stage is required."),
  status: z.string().min(1, "CR Status is required."),
  startDate: z
    .date({
      message: "Start Date is required.",
    })
    .transform((val) => dayjs(val).toDate()), // Ensure it's a Date object
  endDate: z
    .date({
      message: "Due Date is required.",
    })
    .transform((val) => dayjs(val).toDate()), // Ensure it's a Date object
  durationInHours: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().nullable()
    )
    .refine(
      (val) => val !== null && val >= 0 && val <= 999,
      "Duration in hours is required and must be between 0 and 999."
    ),
  NIL: z.string().min(1, "Next in line is required."),
  changeType: z.string().min(1, "Change type is required."), // Corrected from 'change' to 'changeType' based on usage
  severity: z.string().min(1, "Severity is required."),
  family: z.string().min(1, "Family is required."),
  impactedPersona: z
    .array(z.string())
    .min(1, "At least one impacted persona is required."),
  impactedProvider: z
    .array(z.string())
    .min(1, "At least one impacted provider is required."),
  impactedNode: z
    .array(z.string())
    .min(1, "At least one impacted node is required."),
  owner: z.string().min(1, "Owner is required."),
  ownerEmail: z
    .string()
    .email("Invalid owner email format.")
    .optional()
    .or(z.literal("")),
  nominatedDeveloper: z.string().optional().or(z.literal("")), // Can be optional or empty string
  nominatedDeveloperEmail: z
    .string()
    .email("Invalid developer email format.")
    .optional()
    .or(z.literal("")),
  meetAfterCompletion: z.boolean().default(false),
  note: z.string().max(160, "Note cannot exceed 160 characters.").optional(),
  currentState: z.string().optional(),
  futureState: z.string().optional(),
  context: z.string().optional(),
  businessImpact: z.string().optional(),
  currentStateImageURLs: z.array(z.string()).optional(),
  futureStateImageURLs: z.array(z.string()).optional(),
  // Fields that are part of rowData but not directly editable via form controls,
  // but might be needed for the `onSave` payload.
  _id: z.string(), // MongoDB ID
  id: z.string(), // Custom ID
  createdAt: z.string(),
  createdBy: z.string(),
  // Add other fields that come from rowData and are part of the save payload
  nilEmail: z
    .string()
    .email("Invalid NIL email format.")
    .optional()
    .or(z.literal("")),
  noteTrail: z
    .array(
      z.object({
        addedBy: z.string(),
        addedAt: z.string(),
        note: z.string(),
      })
    )
    .optional(),
});