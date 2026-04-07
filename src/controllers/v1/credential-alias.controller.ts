// controllers/v1/credential-alias.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";

export const getCredentialAliasesController = async (
  req: Request,
  res: Response,
) => {
  try {
    if (req.method?.toLowerCase() !== "get") {
      return res.status(405).json({
        error: `Method ${req.method} is not allowed`,
      });
    }

    const users = await db.credentials.findMany({
      where: {
        is_deleted: false,
        alias_email: {
          not: null,
        },
      },
      select: {
        full_name: true,
        alias_email: true,
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An unexpected error occurred, please try again!",
    });
  }
};
