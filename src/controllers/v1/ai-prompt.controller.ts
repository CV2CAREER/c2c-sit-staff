// controllers/v1/ai-prompt.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";

export const aiPromptController = async (req: Request, res: Response) => {
  const method = req.method.toLowerCase();
  const payload = req.body;
  const queries: any = req.query;

  try {
    /* -------------------- POST -------------------- */
    if (method === "post") {
      if (queries?.type === "category") {
        const newCategory = await db.aq_categories.create({
          data: {
            name: payload.name,
          },
        });

        return res.status(201).json({
          message: "Prompt created Successfully",
          status: true,
          data: newCategory,
        });
      } else {
        const newPrompt = await db.aq_prompts.create({
          data: {
            category_id: payload.categoryId,
            value: payload.value,
            client_inputs: payload.clientInputs,
          },
        });

        return res.status(201).json({
          message: "Prompt created Successfully",
          status: true,
          data: newPrompt,
        });
      }
    }

    /* -------------------- GET -------------------- */
    if (method === "get") {
      const allPrompts = await db.aq_prompts.findMany();

      const allCategories = await db.aq_categories.findMany({
        include: {
          prompts: true,
        },
      });

      const allSimulations = await db.aq_simulations.findMany({
        orderBy: { created_at: "desc" },
      });

      return res.status(200).json({
        message: "Data found successfully",
        status: true,
        data: {
          prompts: allPrompts,
          categories: allCategories,
          simulations: allSimulations,
          full: allCategories,
        },
      });
    }

    /* -------------------- DELETE -------------------- */
    if (method === "delete") {
      if (queries.type === "category") {
        if (!queries.id)
          return res.status(400).json({
            message: "No ID found",
            status: false,
          });

        await db.aq_prompts.deleteMany({
          where: { category_id: queries.id },
        });

        await db.aq_categories.delete({
          where: { id: queries.id },
        });

        return res.status(200).json({
          message: "Deleted Successfully",
          status: true,
        });
      } else {
        if (!queries.id)
          return res.status(400).json({
            message: "No ID found",
            status: false,
          });

        await db.aq_prompts.delete({
          where: { id: queries.id },
        });

        return res.status(200).json({
          message: "Deleted Successfully",
          status: true,
        });
      }
    }

    /* -------------------- PUT -------------------- */
    if (method === "put") {
      if (!queries.id)
        return res.status(400).json({
          message: "No ID found",
          status: false,
        });

      await db.aq_prompts.update({
        where: { id: queries.id },
        data: payload,
      });

      return res.status(200).json({
        message: "Updated Successfully",
        status: true,
      });
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
      status: false,
    });
  }
};
