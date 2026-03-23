import ErrorHandler from "../utils/errorHandler";
import jwt from "jsonwebtoken";
import { decryptData, decryptObjectData } from "../utils/security";
import { JWT_VERIFICATION_SECRET_KEY } from "../config/env";
import { JwtPayload } from "../types/token.types";
import OTPToken from "../models/v1/otpToken.model";

export async function validateOTP(otp: string, token: string) {
  if (!token) {
    throw new ErrorHandler("OTP has expired", 401);
  }

  if (!otp || otp.trim() === "") {
    throw new ErrorHandler("All fields are required", 400);
  }

  const decodeToken = jwt.verify(
    token,
    JWT_VERIFICATION_SECRET_KEY as string,
  ) as JwtPayload;

  const decrypted = decryptObjectData(decodeToken.data);

  if (!decrypted) {
    throw new ErrorHandler("Error decrypting token", 400);
  }

  const encryptedVerificationData: { user: string; otp: string } = decrypted;

  const decryptedOTP = decryptData(encryptedVerificationData.otp);

  // otp from the verification tokens record
  const dbOTP = await OTPToken.findOne({
    where: { otp: encryptedVerificationData.otp, revoked: false },
  });

  if (!dbOTP)
    throw new ErrorHandler(
      "Your OTP has expired/invalid. Please check again",
      400,
    );

  // check if otp matches
  if (decryptedOTP !== otp) {
    throw new ErrorHandler("You entered a wrong otp", 403);
  }

  // revoked otp for faster look up
  dbOTP.revoked = true;
  await dbOTP.save();

  const decryptedUser = decryptObjectData(encryptedVerificationData.user);

  return decryptedUser;
}
