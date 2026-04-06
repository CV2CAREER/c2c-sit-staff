
import { Request, Response, NextFunction } from "express";
import { calculateCampaignFields } from "../utils/campaign-calculator";

export function campaignCalculatorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    req.body = calculateCampaignFields(req.body);
    next();
  } catch (error) {
    next(error);
  }
}
