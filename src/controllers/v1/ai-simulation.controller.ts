// controllers/v1/ai-simulation.controller.ts
import { Request, Response } from "express";
import { queryGemini } from "../../utils/factory";
import db from "@/database/postgres";

export const aiSimulationController = async (req: Request, res: Response) => {
  const method = req.method.toLowerCase();
  const payload = req.body;
  const queries: any = req.query;

  try {
    /* ---------------- POST ---------------- */
    if (method === "post") {
      const prompt = `"${payload.prompt}"` || "";

      if (prompt?.length > 0) {
        const text = await queryGemini(prompt);

        const saved = await db.aq_simulations.create({
          data: {
            response: text,
          },
        });

        return res.status(200).json({
          message: "Simulation was successful!",
          status: true,
          data: {
            id: saved.id,
            createdAt: saved.created_at,
            response: text,
          },
        });
      }

      return res.status(402).json({
        message: "Bad Request",
        status: false,
      });
    }

    /* ---------------- GET ---------------- */
    if (method === "get") {
      const allSimulations = await db.aq_simulations.findMany({
        orderBy: { created_at: "desc" },
      });

      return res.status(200).json({
        message: "Simulations found!",
        status: true,
        data: allSimulations,
      });
    }

    /* ---------------- DELETE ---------------- */
    if (method === "delete") {
      await db.aq_simulations.delete({
        where: { id: queries.id },
      });

      return res.status(200).json({
        message: "Deleted simulation!",
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
