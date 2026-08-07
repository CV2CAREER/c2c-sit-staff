// controllers/v1/vcs-prompt-simulation.controller.ts
import { Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { VcsPromptSimulationService } from "../../services/vcs-prompt-simulation.service";

const getActor = (req: any) => ({
  email: req.user?.email,
  firstName: req.user?.firstName,
  lastName: req.user?.lastName,
});

const errorStatus = (message: string) => {
  if (message === "Prompt not found" || message === "Version not found") return 404;
  return 400;
};

export const runVcsPromptSimulation = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptSimulationService.runSimulation(
      req.params.vcsId,
      req.params.versionId,
      (req.body && req.body.variables) || {},
      getActor(req),
    );
    return res.apiSuccess(data, "Simulation complete");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const listVcsPromptSimulationRuns = catchAsyncError(async (req: any, res: Response) => {
  const status =
    req.query.status === "success" || req.query.status === "failed" ? req.query.status : undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const data = await VcsPromptSimulationService.listSimulationRuns(req.params.vcsId, {
    status,
    page,
    limit,
  });
  return res.apiSuccess(data, "Simulation runs retrieved successfully");
});

export const listAllVcsPromptSimulationRuns = catchAsyncError(async (req: any, res: Response) => {
  const status =
    req.query.status === "success" || req.query.status === "failed" ? req.query.status : undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const data = await VcsPromptSimulationService.listAllSimulationRuns({ status, page, limit });
  return res.apiSuccess(data, "Simulation runs retrieved successfully");
});
