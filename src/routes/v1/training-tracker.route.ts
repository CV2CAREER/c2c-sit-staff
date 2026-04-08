import { Router } from "express";
import {
  getTrainingTrackers,
  getTrainingTrackerById,
  createTrainingTracker,
  updateTrainingTracker,
  softDeleteTrainingTracker,
  restoreTrainingTracker,
  deleteTrainingTracker
} from "../../controllers/v1/training-tracker.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const trainingTrackerRouterV1 = Router();

trainingTrackerRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

trainingTrackerRouterV1.get("/", getTrainingTrackers);
trainingTrackerRouterV1.post("/", createTrainingTracker);
trainingTrackerRouterV1.patch("/", updateTrainingTracker);
trainingTrackerRouterV1.patch("/restore", restoreTrainingTracker);
trainingTrackerRouterV1.delete("/", deleteTrainingTracker);
trainingTrackerRouterV1.delete("/soft", softDeleteTrainingTracker);
trainingTrackerRouterV1.get("/id", getTrainingTrackerById);

export default trainingTrackerRouterV1;