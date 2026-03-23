import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { encryptObjectData } from "../utils/security";
import {
  ACCESS_TOKEN_EXPIRATION,
  SIGN_IN_ACCESS_SECRET_KEY,
} from "../config/env";

dotenv.config();

export interface TokenResponse {
  accessToken: string;
}

export const signInCredentials = async (
  user?: User,
): Promise<TokenResponse> => {
  let payload: any;

  // Build payload
  if (user) {
    payload = encryptObjectData({
      id: user.id,
      role: user.role,
    });
  } else {
    throw new ErrorHandler("Failed to sign due to unrecognized details", 403);
  }

  const accessToken = jwt.sign(
    { data: payload },
    SIGN_IN_ACCESS_SECRET_KEY as string,
    { expiresIn: `${ACCESS_TOKEN_EXPIRATION as any}d` },
  );

  return { accessToken };
};
