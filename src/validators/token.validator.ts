import ErrorHandler from "../utils/errorHandler";
import jwt from "jsonwebtoken";
import { decryptObjectData } from "../utils/security";
import { JwtPayload } from "../types/token.types";
import { JWT_VERIFICATION_SECRET_KEY } from "../config/env";

export async function validateVerificationToken(token: string) {
  if (!token) {
    throw new ErrorHandler("Session has expired", 401);
  }

  const decodeToken = jwt.verify(
    token,
    JWT_VERIFICATION_SECRET_KEY as string,
  ) as JwtPayload;

  const decrypted = decryptObjectData(decodeToken.data);

  if (!decrypted) {
    throw new ErrorHandler("Error decrypting token", 403);
  }

  return { tokenValid: true };
}
