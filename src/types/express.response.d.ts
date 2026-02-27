import { Request, Response } from "express";
import ErrorHandler from "../utils/errorHandler";
import User from "../models/v1/user.model";
import { File } from "formidable";

declare global {
  namespace Express {
    interface Request {
      user: User;
      files: { [key: string]: File | File[] };
    }

    interface Response {
      apiSuccess(data: any, message?: string, statusCode?: number): void;
      apiError(
        error?: ErrorHandler,
        message?: string,
        statusCode?: number,
      ): void;
    }
  }
}
