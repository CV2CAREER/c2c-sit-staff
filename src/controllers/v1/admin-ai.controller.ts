import { Request, Response } from "express";
import { randomUUID } from "crypto";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { queryGemini } from "../../utils/factory";
import { systemConfigApplicationService } from "../../services/admin/system-config.application.service";

type AIModuleSlug =
  | "aq-ai"
  | "cv-ai"
  | "interview-preparation"
  | "job-match-ai"
  | "keyword-generator"
  | "market-viability"
  | "preference-ai"
  | "qa-ai"
  | "va-ai";

type PromptCategoryRecord = {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type PromptQuestionRecord = {
  _id: string;
  categoryId: string;
  value: string;
  clientInputs: any[];
  createdAt: string;
  updatedAt: string;
};

type PromptSimulationRecord = {
  _id: string;
  response: string;
  createdAt: string;
};

type PromptVcsRecord = {
  _id: string;
  version: number;
  prompt: string;
  createdAt: string;
};

type AiModuleState = {
  categories: PromptCategoryRecord[];
  prompts: PromptQuestionRecord[];
  simulations: PromptSimulationRecord[];
  queue: string[];
  vcs: {
    activePrompt: string | null;
    prompts: PromptVcsRecord[];
  };
  cvStyle: string;
};

const ALLOWED_MODULES = new Set<AIModuleSlug>([
  "aq-ai",
  "cv-ai",
  "interview-preparation",
  "job-match-ai",
  "keyword-generator",
  "market-viability",
  "preference-ai",
  "qa-ai",
  "va-ai",
]);

const getModuleFromRequest = (req: Request): AIModuleSlug => {
  const moduleSlug = String(req.params.module || "").trim().toLowerCase() as AIModuleSlug;
  if (!ALLOWED_MODULES.has(moduleSlug)) {
    throw new ErrorHandler(`Unsupported AI module: ${moduleSlug}`, 400);
  }
  return moduleSlug;
};

const stateKey = (moduleSlug: AIModuleSlug) => `admin.ai.${moduleSlug}`;

const defaultState = (): AiModuleState => ({
  categories: [],
  prompts: [],
  simulations: [],
  queue: [],
  vcs: { activePrompt: null, prompts: [] },
  cvStyle: "",
});

const loadState = async (moduleSlug: AIModuleSlug): Promise<AiModuleState> => {
  const record = await systemConfigApplicationService.getOrCreate<AiModuleState>(
    stateKey(moduleSlug),
    defaultState(),
  );
  return {
    ...defaultState(),
    ...(record.value || {}),
  };
};

const saveState = async (
  moduleSlug: AIModuleSlug,
  state: AiModuleState,
  updatedByUserId?: string | null,
) => {
  await systemConfigApplicationService.set<AiModuleState>({
    key: stateKey(moduleSlug),
    value: state,
    updatedByUserId: updatedByUserId ?? null,
  });
};

const sortByDateDesc = <T extends { createdAt: string }>(rows: T[]) =>
  [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

export const getAdminAiPrompts = catchAsyncError(async (req: Request, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const state = await loadState(moduleSlug);

  const full = state.categories.map((category) => ({
    ...category,
    prompts: state.prompts.filter((prompt) => prompt.categoryId === category._id),
  }));

  return res.apiSuccess(
    {
      prompts: state.prompts,
      categories: state.categories,
      simulations: sortByDateDesc(state.simulations),
      full,
    },
    "Data found successfully",
  );
});

export const postAdminAiPrompts = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const state = await loadState(moduleSlug);
  const now = new Date().toISOString();
  const type = String(req.query.type || "").toLowerCase();

  if (type === "category") {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.apiError(new ErrorHandler("Category name is required", 400));
    }

    const created: PromptCategoryRecord = {
      _id: randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    };

    await saveState(
      moduleSlug,
      { ...state, categories: [...state.categories, created] },
      req.user?.id ?? null,
    );

    return res.apiSuccess(created, "Prompt created Successfully", 201);
  }

  const categoryId = String(req.body?.categoryId || "").trim();
  if (!categoryId) {
    return res.apiError(new ErrorHandler("categoryId is required", 400));
  }

  const categoryExists = state.categories.some((category) => category._id === categoryId);
  if (!categoryExists) {
    return res.apiError(new ErrorHandler("Category not found", 404));
  }

  const created: PromptQuestionRecord = {
    _id: randomUUID(),
    categoryId,
    value: String(req.body?.value || ""),
    clientInputs: Array.isArray(req.body?.clientInputs) ? req.body.clientInputs : [],
    createdAt: now,
    updatedAt: now,
  };

  await saveState(
    moduleSlug,
    { ...state, prompts: [...state.prompts, created] },
    req.user?.id ?? null,
  );

  return res.apiSuccess(created, "Prompt created Successfully", 201);
});

export const putAdminAiPrompts = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const promptId = String(req.query.id || "").trim();

  if (!promptId) {
    return res.apiError(new ErrorHandler("No ID found", 400));
  }

  const state = await loadState(moduleSlug);
  const now = new Date().toISOString();
  const promptIndex = state.prompts.findIndex((prompt) => prompt._id === promptId);

  if (promptIndex === -1) {
    return res.apiError(new ErrorHandler("Prompt not found", 404));
  }

  const current = state.prompts[promptIndex];
  const updated: PromptQuestionRecord = {
    ...current,
    ...req.body,
    _id: current._id,
    categoryId: String(req.body?.categoryId || current.categoryId),
    clientInputs: Array.isArray(req.body?.clientInputs)
      ? req.body.clientInputs
      : current.clientInputs,
    updatedAt: now,
  };

  const prompts = [...state.prompts];
  prompts[promptIndex] = updated;

  await saveState(moduleSlug, { ...state, prompts }, req.user?.id ?? null);

  return res.apiSuccess(updated, "Updated Successfully");
});

export const deleteAdminAiPrompts = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const promptOrCategoryId = String(req.query.id || "").trim();
  const type = String(req.query.type || "").toLowerCase();

  if (!promptOrCategoryId) {
    return res.apiError(new ErrorHandler("No ID found", 400));
  }

  const state = await loadState(moduleSlug);

  if (type === "category") {
    const categories = state.categories.filter((category) => category._id !== promptOrCategoryId);
    const prompts = state.prompts.filter((prompt) => prompt.categoryId !== promptOrCategoryId);

    await saveState(moduleSlug, { ...state, categories, prompts }, req.user?.id ?? null);
    return res.apiSuccess({}, "Deleted Successfully");
  }

  const prompts = state.prompts.filter((prompt) => prompt._id !== promptOrCategoryId);
  await saveState(moduleSlug, { ...state, prompts }, req.user?.id ?? null);
  return res.apiSuccess({}, "Deleted Successfully");
});

export const getAdminAiQueue = catchAsyncError(async (req: Request, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const state = await loadState(moduleSlug);
  return res.apiSuccess(state.queue, "Queue retrieved");
});

export const postAdminAiQueue = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const input = String(req.body?.input || "").trim();
  if (!input) {
    return res.apiError(new ErrorHandler("Input is required", 400));
  }

  const state = await loadState(moduleSlug);
  const queue = state.queue.includes(input) ? state.queue : [...state.queue, input];
  await saveState(moduleSlug, { ...state, queue }, req.user?.id ?? null);
  return res.apiSuccess(queue, "Input added to queue");
});

export const deleteAdminAiQueue = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const state = await loadState(moduleSlug);
  await saveState(moduleSlug, { ...state, queue: [] }, req.user?.id ?? null);
  return res.apiSuccess([], "Queue cleared");
});

export const getAdminAiVcs = catchAsyncError(async (req: Request, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const state = await loadState(moduleSlug);
  return res.apiSuccess(
    {
      activePrompt: state.vcs.activePrompt,
      prompts: [...state.vcs.prompts].sort((a, b) => b.version - a.version),
    },
    "VCS retrieved",
  );
});

export const postAdminAiVcs = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const prompt = String(req.body?.prompt || "");
  if (!prompt.trim()) {
    return res.apiError(new ErrorHandler("Prompt is required", 400));
  }

  const state = await loadState(moduleSlug);
  const maxVersion = state.vcs.prompts.reduce(
    (max, row) => (row.version > max ? row.version : max),
    99,
  );

  const created: PromptVcsRecord = {
    _id: randomUUID(),
    version: maxVersion + 1,
    prompt,
    createdAt: new Date().toISOString(),
  };

  await saveState(
    moduleSlug,
    {
      ...state,
      vcs: {
        activePrompt: created._id,
        prompts: [...state.vcs.prompts, created],
      },
    },
    req.user?.id ?? null,
  );

  return res.apiSuccess(created, "Version created", 201);
});

export const putAdminAiVcs = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const promptId = String(req.body?.promptId || "").trim();
  if (!promptId) {
    return res.apiError(new ErrorHandler("promptId is required", 400));
  }

  const state = await loadState(moduleSlug);
  const exists = state.vcs.prompts.some((prompt) => prompt._id === promptId);
  if (!exists) {
    return res.apiError(new ErrorHandler("Prompt version not found", 404));
  }

  await saveState(
    moduleSlug,
    { ...state, vcs: { ...state.vcs, activePrompt: promptId } },
    req.user?.id ?? null,
  );

  return res.apiSuccess({ activePrompt: promptId }, "Active version updated");
});

export const getAdminAiSimulations = catchAsyncError(async (req: Request, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const state = await loadState(moduleSlug);
  return res.apiSuccess(sortByDateDesc(state.simulations), "Simulations found!");
});

export const postAdminAiSimulation = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.apiError(new ErrorHandler("Prompt is required", 400));
  }

  const state = await loadState(moduleSlug);
  const response = await queryGemini(`"${prompt}"`);

  const created: PromptSimulationRecord = {
    _id: randomUUID(),
    response: response || "",
    createdAt: new Date().toISOString(),
  };

  await saveState(
    moduleSlug,
    { ...state, simulations: [created, ...state.simulations] },
    req.user?.id ?? null,
  );

  return res.apiSuccess(created, "Simulation was successful!");
});

export const deleteAdminAiSimulation = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  const simulationId = String(req.query.id || "").trim();
  if (!simulationId) {
    return res.apiError(new ErrorHandler("Simulation id is required", 400));
  }

  const state = await loadState(moduleSlug);
  const simulations = state.simulations.filter((simulation) => simulation._id !== simulationId);
  await saveState(moduleSlug, { ...state, simulations }, req.user?.id ?? null);
  return res.apiSuccess({}, "Deleted simulation!");
});

export const getAdminAiCvStyle = catchAsyncError(async (req: Request, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  if (moduleSlug !== "cv-ai") {
    return res.apiError(new ErrorHandler("Style endpoint is only available for cv-ai", 400));
  }

  const state = await loadState(moduleSlug);
  return res.apiSuccess({ result: state.cvStyle || "" }, "CV style fetched successfully");
});

export const postAdminAiCvStyle = catchAsyncError(async (req: any, res: Response) => {
  const moduleSlug = getModuleFromRequest(req);
  if (moduleSlug !== "cv-ai") {
    return res.apiError(new ErrorHandler("Style endpoint is only available for cv-ai", 400));
  }

  const input = String(req.body?.input || "");
  const state = await loadState(moduleSlug);

  await saveState(moduleSlug, { ...state, cvStyle: input }, req.user?.id ?? null);
  return res.apiSuccess({ result: input }, "CV style updated successfully");
});
