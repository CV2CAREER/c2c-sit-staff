import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { passKeyVaultService } from "../../services/admin/passkey-vault.service";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("passkey-vault-controller");

/**
 * POST 
 * Set or update audit trail passkey
 */
export const setPasskey = catchAsyncError(
  async (req: Request, res: Response) => {
    const { passKey } = req.body;
    const userId = (req as any).user?.id;

    if (!passKey) {
      throw new ErrorHandler("Passkey is required", 400);
    }

    const result = await passKeyVaultService.setAuditTrailPasskey(passKey, userId);

    res.apiSuccess(
      null,
      result.created ? "Passkey created successfully" : "Passkey updated successfully",
      result.created ? 201 : 200
    );
  },
);

/**
 * POST 
 * Verify passkey
 */
export const verifyPasskey = catchAsyncError(
  async (req: Request, res: Response) => {
    const { passKey } = req.body;

    if (!passKey) {
      throw new ErrorHandler("Passkey is required", 400);
    }

    const isValid = await passKeyVaultService.verifyPasskey(passKey);

    res.apiSuccess(
      { valid: isValid },
      isValid ? "Passkey is valid" : "Passkey is invalid"
    );
  },
);