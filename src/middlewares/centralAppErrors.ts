import { getServiceLogger } from "../utils/createLogger";
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/errorHandler";

const logger = getServiceLogger("central-app-error");

const centralAppErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log(err);
  logger.error(err.message);
  err.statusCode = typeof err === "object" ? err.statusCode || 500 : 500;
  err.message =
    typeof err === "object"
      ? err.message || "Something went wrong. Please try again later."
      : String(err);
  err.name =
    typeof err === "object"
      ? err.name || "Something went wrong. Please try again later."
      : String(err);

  if (err.name === "TokenExpiredError" || err.message === "jwt expired") {
    const message = "Session ID has expired";
    err = new ErrorHandler(message, 400);
  }

  if (err.message === "jwt must be provided") {
    const message = "Session has no valid ID.";
    err = new ErrorHandler(message, 401);
  }

  if (err.message === "invalid signature") {
    const message = "Session is not authorized.";
    err = new ErrorHandler(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    const message = "Session can not be validated.";
    err = new ErrorHandler(message, 401);
  }

  if (err.name === "SequelizeHostNotFoundError") {
    const message = "Network error. Please check you network and reconnect";
    err = new ErrorHandler(message, 500);
  }

  if (err.message.startsWith("ConnectionManager.getConnection")) {
    const message = "Request could not be completed.";
    err = new ErrorHandler(message, 400);
  }

  res.apiError(err);
};

export default centralAppErrors;
