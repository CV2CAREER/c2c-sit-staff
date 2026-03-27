import { parsePhoneNumber } from 'libphonenumber-js';


import { z } from "zod";
// import { parsePhoneNumberFromString } from "libphonenumber-js";

export const RegisterValidationSchema = z.object({
  firstName: z.string().nonempty("First name is required"),
  lastName: z.string().nonempty("Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().refine(
    (value) => {
      const phone = parsePhoneNumber(value || "");
      return phone?.isValid();
    },
    {
      message: "Invalid phone number",
    }
  ),
  agreeToTerms: z.literal(true, {
    message: "You must accept the terms and conditions",
  }),
});

export const LoginValidationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().nonempty("Password is required"),
});


export const adminRegistrationSchema = z.object({
  firstName: z.string().min(3, { message: "name must be atleast 3 letters" }),
  lastName: z.string().min(2),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be atleast 6 characters" }),
  country: z.string(),
  phoneNumber: z
    .string()
    .min(8, { message: "Provide a Valid Phone Number" })
    .transform((val) => val.replace(/[^\d+]/g, ""))
    .refine((val) => /^\+\d{8,15}$/.test(val), {
      message: "Phone Number Invalid",
    }),
  agreeToTerms: z.boolean({ message: "This feild is required" }),
});



/**
 * @description this is a schema object for the Coach Session Page
 * @usage used only in `coach/_components/manage-session.tsx`
 */
export const CoachSessionSchema = z.object({
  additionalInfo: z.string(),
  meetingLink: z.string(),
});

/**
 * @description Zod schema for user registration.
 * @usage Used in the registration process to validate user input.
 */
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
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * @description this is a schema object for the Coach Profile Page
 * @usage used only in `coach/_components/edit-profile.tsx`
 */
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
    phoneNumber: z.string().refine(
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
    password: z.optional(z.string()),
    confirmPassword: z.optional(z.string()),
    country: z.string().min(2, {
      message: "Required",
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
  callbackUrl: z.string().optional(),
});
