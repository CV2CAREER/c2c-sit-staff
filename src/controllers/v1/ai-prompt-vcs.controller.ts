// controllers/v1/ai-prompt-vcs.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";

export const aiPromptVcsController = async (req: Request, res: Response) => {
  const method = req.method.toLowerCase();
  const payload = req.body;

  try {
    /* ---------------- POST ---------------- */
    if (method === "post") {
      let currentVCS = await db.aq_vcs.findFirst();

      let version = 100;

      if (currentVCS) {
        const maxVersion = await db.aq_vcs_prompts.aggregate({
          _max: { version: true },
        });
        version = (maxVersion._max.version || 100) + 1;
      }

      const newPrompt = await db.aq_vcs_prompts.create({
        data: {
          version,
          prompt: payload.prompt,
        },
      });

      if (!currentVCS) {
        await db.aq_vcs.create({
          data: {
            active_prompt: newPrompt.id,
          },
        });
      } else {
        await db.aq_vcs.update({
          where: { id: currentVCS.id },
          data: { active_prompt: newPrompt.id },
        });
      }

      return res.status(201).json({
        success: true,
        data: newPrompt,
      });
    }

    /* ---------------- GET ---------------- */
    if (method === "get") {
      const vcs = await db.aq_vcs.findFirst();

      if (!vcs) {
        return res.status(404).json({
          message: "No Version Control System!",
        });
      }

      const prompts = await db.aq_vcs_prompts.findMany({
        orderBy: { version: "desc" },
      });

      return res.status(200).json({
        success: true,
        data: {
          activePrompt: vcs.active_prompt,
          prompts,
        },
      });
    }

    /* ---------------- PUT ---------------- */
    if (method === "put") {
      const vcs = await db.aq_vcs.findFirst();

      if (!vcs) {
        return res.status(404).json({
          message: "No Version Control System!",
        });
      }

      await db.aq_vcs.update({
        where: { id: vcs.id },
        data: {
          active_prompt: payload.promptId,
        },
      });

      return res.status(200).json({
        message: "Updated VCS",
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
    });
  }
};
