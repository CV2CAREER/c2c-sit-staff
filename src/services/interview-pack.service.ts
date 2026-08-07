import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { Upload } from "../models/v1/upload.model";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { VcsPromptUsageService } from "./vcs-prompt-usage.service";
import { AdminDocumentService } from "./admin-document.service";
import {
  InterviewPackProcess,
  InterviewPackProcessStatus,
} from "../models/v1/interview-pack-process.model";
import {
  INTERVIEW_PACK_FOUNDATIONAL_PROMPT_KEY,
  INTERVIEW_PACK_STAR_BANK_PROMPT_KEY,
  INTERVIEW_PACK_TECHNICAL_PROMPT_KEY,
  INTERVIEW_PACK_CLOSING_PROMPT_KEY,
} from "../scripts/seed-vcs-interview-pack-prompts";

const logger = getServiceLogger("interview-pack-service");

const STAGE_PROMPT_KEYS = [
  INTERVIEW_PACK_FOUNDATIONAL_PROMPT_KEY,
  INTERVIEW_PACK_STAR_BANK_PROMPT_KEY,
  INTERVIEW_PACK_TECHNICAL_PROMPT_KEY,
  INTERVIEW_PACK_CLOSING_PROMPT_KEY,
] as const;

const STAGE_RESULT_FIELDS = [
  "stage1Result",
  "stage2Result",
  "stage3Result",
  "stage4Result",
] as const;

const STAGE_LABELS = [
  "Foundational",
  "STAR Answer Bank",
  "Technical Deep-Dive",
  "Closing",
] as const;

/**
 * Drives the 4-stage "Generate Interview Pack" AI pipeline. Each stage is a
 * separate, sequential AI call (never batched, per the requirement that
 * splitting the prompt gets materially better output than one combined
 * call). Every stage's result is persisted on the InterviewPackProcess row
 * as soon as it completes, so a failure partway through resumes from the
 * failed stage using the already-generated earlier results instead of
 * restarting the whole pack.
 */
export class InterviewPackService {
  private static async getStagePrompt(
    key: string,
    cvText: string,
    jobContent: string,
    jobLink: string | undefined,
    previousContext: Record<string, unknown> | null,
  ): Promise<{ prompt: string; vcsId: string; promptId: string; version: string | null }> {
    const { VCS, VCSPrompt } = await import("../models/v1/keyword-population.model");
    const foundVCS = await VCS.findOne({ where: { active: true, key } });
    const promptRow = foundVCS ? await VCSPrompt.findByPk(foundVCS.activePromptId) : null;

    if (!promptRow || !foundVCS) {
      throw new ErrorHandler(`Interview pack prompt "${key}" is not configured`, 500);
    }

    const prompt = promptRow.prompt
      .replace(/\{\{CV_CONTENT\}\}/g, cvText)
      .replace(/\{\{JOB_CONTENT\}\}/g, jobContent || "")
      .replace(/\{\{JOB_LINK\}\}/g, jobLink || "Not provided")
      .replace(/\{\{PREVIOUS_CONTEXT\}\}/g, previousContext ? JSON.stringify(previousContext) : "");

    return { prompt, vcsId: foundVCS.id, promptId: promptRow.id, version: promptRow.version };
  }

  private static parseStageJson<T>(aiResponse: string, stageLabel: string): T {
    const cleanResponse = aiResponse.replace(/```(?:json)?\s*|\s*```/gi, "").trim();
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new ErrorHandler(`AI response for stage "${stageLabel}" did not contain valid JSON`, 500);
    }
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      throw new ErrorHandler(`Failed to parse AI-generated "${stageLabel}" result`, 500);
    }
  }

  /**
   * Starts a new Interview Pack process for a resume, or transparently
   * resumes its existing non-completed one — enforces at most one active
   * process per *resume* (not per user) rather than erroring or silently
   * starting a second, competing one. Scoped to the resume rather than the
   * user because a client can have multiple resumes uploaded: a stuck/failed
   * process on one resume must not block generating a pack for another.
   */
  static async startOrResume(
    targetUserId: string,
    resumeUploadId: string,
    jobContent: string,
    jobLink: string | undefined,
    createdBy: string | undefined,
  ): Promise<InterviewPackProcess> {
    const existing = await InterviewPackProcess.findOne({
      where: {
        userId: targetUserId,
        resumeUploadId,
        status: {
          [Op.in]: [InterviewPackProcessStatus.IN_PROGRESS, InterviewPackProcessStatus.FAILED],
        },
      },
      order: [["createdAt", "DESC"]],
    });
    if (existing) {
      logger.info(`[InterviewPack] Resuming existing process ${existing.id} for resume ${resumeUploadId}`);
      return existing;
    }

    if (!jobContent?.trim()) {
      throw new ErrorHandler("Job content is required", 400);
    }

    const upload = await Upload.findOne({
      where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
    });
    if (!upload) {
      throw new ErrorHandler("Resume not found or does not belong to user", 404);
    }

    const process = await InterviewPackProcess.create({
      userId: targetUserId,
      resumeUploadId,
      jobLink: jobLink || null,
      jobContent,
      currentStage: 1,
      status: InterviewPackProcessStatus.IN_PROGRESS,
      createdBy: createdBy || null,
    });

    logger.info(`[InterviewPack] Started new process ${process.id} for user ${targetUserId}`);
    return process;
  }

  /**
   * Runs whichever stage `process.currentStage` currently points at. On
   * success, persists that stage's result and advances currentStage (marking
   * the process `completed` once stage 4 lands). On failure, marks the
   * process `failed` WITHOUT advancing currentStage, so the next call against
   * this same processId retries the exact same stage, reusing whatever
   * earlier stages already succeeded.
   */
  static async runNextStage(processId: string, targetUserId: string): Promise<InterviewPackProcess> {
    const process = await InterviewPackProcess.findOne({
      where: { id: processId, userId: targetUserId },
    });
    if (!process) {
      throw new ErrorHandler("Interview pack process not found", 404);
    }
    if (process.status === InterviewPackProcessStatus.COMPLETED) {
      return process;
    }

    const stage = process.currentStage;
    if (stage < 1 || stage > 4) {
      throw new ErrorHandler(`Invalid stage ${stage} on interview pack process`, 500);
    }

    const upload = await Upload.findOne({
      where: { id: process.resumeUploadId, userId: targetUserId, type: "resume" },
    });
    if (!upload) {
      throw new ErrorHandler("Resume not found or does not belong to user", 404);
    }
    const docMeta = Array.isArray(upload.document) ? upload.document[0] : upload.document;
    const fileUrl = docMeta?.url;
    if (!fileUrl) {
      throw new ErrorHandler("Could not find the document URL for this resume.", 400);
    }

    try {
      const resumeText = await AdminDocumentService.extractResumeText(fileUrl);

      // Stages 2-4 all key off the candidateProfile/gapAnalysis established
      // in stage 1 — never off each other's output.
      const stage1Result = process.stage1Result as Record<string, unknown> | undefined;
      const previousContext = stage > 1 && stage1Result
        ? {
            candidateProfile: stage1Result.candidateProfile,
            gapAnalysis: stage1Result.gapAnalysis,
          }
        : null;

      const key = STAGE_PROMPT_KEYS[stage - 1];
      const stageLabel = STAGE_LABELS[stage - 1];
      const { prompt, vcsId, promptId, version } = await this.getStagePrompt(
        key,
        resumeText,
        process.jobContent,
        process.jobLink,
        previousContext,
      );

      const startedAt = Date.now();
      let aiResponse: string;
      try {
        aiResponse = await queryDigitalOceanAI(prompt);
        VcsPromptUsageService.record({
          key,
          vcsId,
          promptId,
          version,
          promptLength: prompt.length,
          responseLength: aiResponse.length,
          durationMs: Date.now() - startedAt,
          success: true,
        });
      } catch (error: any) {
        VcsPromptUsageService.record({
          key,
          vcsId,
          promptId,
          version,
          promptLength: prompt.length,
          durationMs: Date.now() - startedAt,
          success: false,
          errorMessage: error?.message,
        });
        throw error;
      }

      const stageResult = this.parseStageJson<Record<string, unknown>>(aiResponse, stageLabel);

      const resultField = STAGE_RESULT_FIELDS[stage - 1];
      const isLastStage = stage === 4;

      await process.update({
        [resultField]: stageResult,
        currentStage: isLastStage ? stage : stage + 1,
        status: isLastStage ? InterviewPackProcessStatus.COMPLETED : InterviewPackProcessStatus.IN_PROGRESS,
        errorMessage: null,
      });

      logger.info(`[InterviewPack] Process ${process.id} completed stage ${stage} (${stageLabel}) for user ${targetUserId}`);
      return process;
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      logger.error(`[InterviewPack] Process ${process.id} failed on stage ${stage}: ${message}`);
      await process.update({
        status: InterviewPackProcessStatus.FAILED,
        errorMessage: String(message).slice(0, 1024),
      });
      throw error instanceof ErrorHandler
        ? error
        : new ErrorHandler(`Interview pack stage ${stage} (${STAGE_LABELS[stage - 1]}) failed: ${message}`, 500);
    }
  }

  static async getProcess(processId: string, targetUserId: string): Promise<InterviewPackProcess> {
    const process = await InterviewPackProcess.findOne({
      where: { id: processId, userId: targetUserId },
    });
    if (!process) {
      throw new ErrorHandler("Interview pack process not found", 404);
    }
    return process;
  }
}
