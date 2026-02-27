import { NextFunction, Request, Response } from "express";
import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";

const logger = getServiceLogger("db-ready");

let isDbReady = false;

export function setDbReady(state: boolean) {
  isDbReady = state;
}

export function getDbReady() {
  return isDbReady;
}

export function dbMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isDbReady) {
    logger.error("Network is taking too long. Please try again shortly.");
    return next(
      new ErrorHandler(
        "Network is taking too long. Please try again shortly.",
        503,
      ),
    );
  }

  next();
}
