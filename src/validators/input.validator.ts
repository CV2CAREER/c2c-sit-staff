import { ILoginOptions, IUserRegistration } from "../types/user.types";
import { AcceptedRole, Gender } from "../utils/enum";
import { trimString } from "../utils/helpers";
import { validatePasswordStrength } from "./password.validator";

export const isEmailValid: RegExp =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateRegisterInput(data: IUserRegistration): string | null {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    voiceNumber,
    whatsappNumber,
    country,
    currentCityOfResidence,
    confirmPassword,
    agreeToTerms,
    gender,
  } = data;

  const requiredFields = {
    firstName,
    lastName,
    email,
    password,
    voiceNumber,
    whatsappNumber,
    gender,
    country,
    currentCityOfResidence,
    role,
    agreeToTerms,
    confirmPassword,
  };

  // Check if any required field is missing or falsy
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return `Required field "${key}" cannot be empty`;
    }
  }

  if (!isEmailValid.test(email)) {
    return "Email is not valid. Please enter a valid email";
  }

  if (trimString(password) !== trimString(confirmPassword)) {
    return "Password and Confirm Password does not match";
  }

  if (!Object.values(AcceptedRole).includes(data.role)) {
    return `Invalid role. This role is not recognized on this platform`;
  }

  if (!Object.values(Gender).includes(data.gender)) {
    return `Invalid gender. Allowed values: ${Object.values(Gender).join(
      ", ",
    )}`;
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return passwordError;
  }

  return null;
}

export function validateSignInInput(data: ILoginOptions): string | null {
  const { email, password } = data;

  const requiredFields = {
    email,
    password,
  };

  // Check if any required field is missing or falsy
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return `Required field "${key}" cannot be empty`;
    }
  }

  if (!isEmailValid.test(email)) {
    return "Please enter a valid email";
  }

  return null;
}
