import { IUser, IUserRegistration } from "../types/user.types";
import jwt from "jsonwebtoken";
import { encryptData, encryptObjectData } from "./security";
import {
  CLIENT_APP_DOMAIN,
  IAT_FRONTEND_URL,
  JWT_VERIFICATION_SECRET_KEY,
  JWT_VERIFICATION_SECRET_KEY_EXPIRY,
  LOCAL_FRONTEND_URL,
  NODE_ENV,
  PROD_FRONTEND_URL,
  RAT_FRONTEND_URL,
  SIT_FRONTEND_URL,
  UAT_FRONTEND_URL,
} from "../config/env";
import { User } from "../models/v1/user.model";

// HELPERS
export function trimString(word: string): string {
  return word.trim();
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function createVerificationToken(user: Partial<IUserRegistration>) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // generates random 6 digit code

  // extra security layer
  const encryptedOtp = encryptData(otp);
  const encryptedUser = encryptObjectData(user);

  const payload = encryptObjectData({ user: encryptedUser, otp: encryptedOtp });

  const verificationToken = jwt.sign(
    { data: payload },
    JWT_VERIFICATION_SECRET_KEY as string,
    { expiresIn: `${JWT_VERIFICATION_SECRET_KEY_EXPIRY as any}m` },
  );

  return { otp: encryptedOtp, verificationToken };
}

export function createResetPasswordToken(user: User) {
  const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // extra security layer
  const encryptedOtp = encryptData(resetOTP);
  const encryptedUser = encryptObjectData(user);

  const payload = encryptObjectData({ user: encryptedUser, otp: encryptedOtp });

  const resetToken = jwt.sign(
    { data: payload },
    JWT_VERIFICATION_SECRET_KEY as string,
    {
      expiresIn: `${JWT_VERIFICATION_SECRET_KEY_EXPIRY as any}m`,
    },
  );

  return { resetOTP: encryptedOtp, resetToken };
}

export function isRedisUsable(client: any) {
  return client && client.status === "ready";
}

export const getFrontendUrl = (): string => {
  const urlMap: Record<string, string | undefined> = {
    rat: RAT_FRONTEND_URL,
    iat: IAT_FRONTEND_URL,
    sit: SIT_FRONTEND_URL,
    uat: UAT_FRONTEND_URL,
    prod: PROD_FRONTEND_URL,
    local: LOCAL_FRONTEND_URL,
  };

  const url = urlMap[NODE_ENV!];

  // Missing per-env var used to throw, which silently killed the whole
  // notification block (fire-and-forget callers log & drop). Fall back to the
  // resolved client-app domain instead: env var → env-name convention, so a
  // hosted environment never loses its links or degrades to localhost.
  if (!url) {
    return CLIENT_APP_DOMAIN;
  }

  return url;
};

export const getFullName = (nameObj: any) => {
  return nameObj?.firstName + " " + nameObj?.lastName;
};

export async function updateReferrerStats(entity: any) {
  const promoCount = (entity.numberOfFreePromoCount || 0) + 1;

  if (promoCount <= entity.numberOfFreePromo) {
    await entity.update({ numberOfFreePromoCount: promoCount });
  } else {
    await entity.update({
      promotionalCount: 0,
      numberOfFreePromoCount: 0,
      allowFreeBeforeReferal: false,
    });
  }
}

export const generateReferralCode = async (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};

export const sanitizeUserRegistration = (
  user: User,
): Partial<IUserRegistration> => {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: user.password,
    agreeToTerms: user.agreeToTerms,
    country: user.country,
    currentCityOfResidence: user.currentCityOfResidence,
    gender: user.gender,
    middleName: user.middleName,
    voiceNumber: user.phoneNumber,
    whatsappNumber: user.whatsappNumber,
  };
};

export type IUserWithPassword = IUser & {
  password: string;
};

export const sanitizeUserResponse = (
  user: IUserWithPassword | { toJSON(): IUserWithPassword },
): IUser => {
  const plainUser = "toJSON" in user ? user.toJSON() : user;

  const { password, ...sanitized } = plainUser;

  return sanitized;
};

export function extractBearerToken(authHeader?: string): string | undefined {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
}

export const frontendUrl = getFrontendUrl();
