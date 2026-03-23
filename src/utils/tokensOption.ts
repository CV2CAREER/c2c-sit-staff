import {
  ACCESS_TOKEN_EXPIRATION,
  JWT_VERIFICATION_SECRET_KEY_EXPIRY,
  NODE_ENV,
} from "../config/env";

export interface ITokenOptions {
  maxAge: number;
  httpOnly: boolean;
  sameSite: "none" | "lax" | "strict";
  secure?: boolean;
  path: string;
}

const isProduction = NODE_ENV !== "local";

export const verificationTokenOptions: ITokenOptions = {
  maxAge: JWT_VERIFICATION_SECRET_KEY_EXPIRY * 60 * 1000,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};

// cookies options
export const accessTokenOptions: ITokenOptions = {
  maxAge: ACCESS_TOKEN_EXPIRATION * 24 * 60 * 60 * 1000, // days
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  path: "/",
};
