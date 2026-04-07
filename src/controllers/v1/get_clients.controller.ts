// controllers/v1/admin-credentials.controller.ts
import { Request, Response } from "express";
import { Credentials } from "../../models/v1/credentials.model";

export const getAllCredentials = async (req: Request, res: Response) => {
  try {
    const response = await Credentials.findAll({
      where: { deletedAt: null },
      paranoid: true,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
};
