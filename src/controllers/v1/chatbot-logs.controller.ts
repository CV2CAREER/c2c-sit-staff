// controllers/v1/chatbot-logs.controller.ts
import { Request, Response } from "express";
import dayjs from "dayjs";
import { Op } from "sequelize";
import { Log } from "@/models/v1/log.model";

export const chatbotLogsController = async (req: Request, res: Response) => {
  try {
    const dateParam =
      (req.query.date as string) || dayjs().format("YYYY-MM-DD");

    const start = new Date(`${dateParam}T00:00:00.000Z`);
    const end = new Date(`${dateParam}T23:59:59.999Z`);

    const logs = await Log.findAll({
      where: {
        type: "bot_log",
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching chatbot logs by date:", error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
