import { Request, Response } from "express";
import { Op } from "sequelize";
import { CvRevamp } from "../../models/v1/cv-revamp.model";
import { Upload } from "../../models/v1/upload.model";
import { User } from "../../models/v1/user.model";
import ApiResponse from "../../utils/apiResponse";

/**
 * Get all CV revamps or filter by docId/userId
 */
export const getCvRevamps = async (req: Request, res: Response) => {
  try {
    const { docId, userId } = req.query;

    const filter: Record<string, any> = {};
    if (docId) filter.id = docId;
    if (userId) filter.userId = userId;

    const revamps = await CvRevamp.findAll({
      where: filter,
      include: [
        { model: Upload, as: 'upload', attributes: ['fileName', 'url'] },
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(ApiResponse.success({ message: "CV revamps fetched successfully", data: revamps }));
  } catch (error: any) {
    console.error("Error fetching CV revamps:", error);
    return res.status(500).json(ApiResponse.error({ message: error.message || "Failed to fetch CV revamps", statusCode: 500 }));
  }
};

/**
 * Get a single CV revamp by ID
 */
export const getCvRevampById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const revamp = await CvRevamp.findByPk(id, {
      include: [
        { model: Upload, as: 'upload', attributes: ['fileName', 'url'] },
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });

    if (!revamp) {
      return res.status(404).json(ApiResponse.error({ message: "CV revamp not found", statusCode: 404 }));
    }

    return res.status(200).json(ApiResponse.success({ message: "CV revamp fetched successfully", data: revamp }));
  } catch (error: any) {
    console.error("Error fetching CV revamp:", error);
    return res.status(500).json(ApiResponse.error({ message: error.message || "Failed to fetch CV revamp", statusCode: 500 }));
  }
};

/**
 * Create a new CV revamp request
 */
export const createCvRevamp = async (req: Request, res: Response) => {
  try {
    const { cvId, create } = req.query;
    const { sourceFile, userId, fullName, url, fileName } = req.body;

    // Handle legacy query-based creation
    if (cvId && create === "true") {
      const existingRevamp = await CvRevamp.findOne({ where: { uploadId: cvId } });
      if (existingRevamp) {
        return res.status(200).json(ApiResponse.success({ message: "CV revamp already exists", data: existingRevamp }));
      }
    }

    const revamp = await CvRevamp.create({
      uploadId: sourceFile || cvId,
      userId,
      fullName,
      url,
      fileName,
      status: "pending",
    } as any);

    return res.status(201).json(ApiResponse.success({ message: "CV revamp created successfully", data: revamp, statusCode: 201 }));
  } catch (error: any) {
    console.error("Error creating CV revamp:", error);
    return res.status(500).json(ApiResponse.error({ message: error.message || "Failed to create CV revamp", statusCode: 500 }));
  }
};

/**
 * Update CV revamp status (approve/decline)
 */
export const updateCvRevampStatus = async (req: Request, res: Response) => {
  try {
    const { docId, action } = req.query;

    if (!docId) {
      return res.status(400).json(ApiResponse.error({ message: "Document ID is required", statusCode: 400 }));
    }

    const validActions = ["approved", "declined", "pending"];
    if (action && !validActions.includes(action as string)) {
      return res.status(400).json(ApiResponse.error({ message: "Invalid action. Must be: approved, declined, or pending", statusCode: 400 }));
    }

    const revamp = await CvRevamp.findByPk(docId as string);

    if (!revamp) {
      return res.status(404).json(ApiResponse.error({ message: "CV revamp not found", statusCode: 404 }));
    }

    await revamp.update({ status: action || "approved" });

    return res.status(200).json(ApiResponse.success({ message: `CV revamp ${action || "approved"} successfully`, data: revamp }));
  } catch (error: any) {
    console.error("Error updating CV revamp status:", error);
    return res.status(500).json(ApiResponse.error({ message: error.message || "Failed to update CV revamp status", statusCode: 500 }));
  }
};

/**
 * Delete a CV revamp
 */
export const deleteCvRevamp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const revamp = await CvRevamp.findByPk(id as string);

    if (!revamp) {
      return res.status(404).json(ApiResponse.error({ message: "CV revamp not found", statusCode: 404 }));
    }

    await revamp.destroy();

    return res.status(200).json(ApiResponse.success({ message: "CV revamp deleted successfully", data: revamp }));
  } catch (error: any) {
    console.error("Error deleting CV revamp:", error);
    return res.status(500).json(ApiResponse.error({ message: error.message || "Failed to delete CV revamp", statusCode: 500 }));
  }
};