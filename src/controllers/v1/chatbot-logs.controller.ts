// controllers/v1/chatbot-logs.controller.ts
import { Request, Response } from "express";
import dayjs from "dayjs";
import db from "@/database/postgres";

export const chatbotLogsController = async (req: Request, res: Response) => {
  try {
    const dateParam =
      (req.query.date as string) || dayjs().format("YYYY-MM-DD");

    const start = new Date(`${dateParam}T00:00:00.000Z`);
    const end = new Date(`${dateParam}T23:59:59.999Z`);

    const logs = await db.ChatBotLog.findAll({
      where: {
        timestamp: {
          [db.Sequelize.Op.between]: [start, end],
        },
      },
      order: [["timestamp", "DESC"]],
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching logs by date:", error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};
