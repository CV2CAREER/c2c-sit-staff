import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { PromotionService } from "../../services/promotion.service";

/**
 * Get promotion by code (NO AUTH)
 */
export const getPromotionByCode = catchAsyncError(async (req: Request, res: Response) => {
  const { promotionCode } = req.query;
  
  if (!promotionCode) {
    return res.status(400).json({
      success: false,
      message: "Promotion code is required"
    });
  }

  const promotion = await PromotionService.getPromotionByCode(promotionCode as string);
  
  if (!promotion) {
    return res.status(404).json({
      success: false,
      message: "Promotion not found"
    });
  }

  res.status(200).json({
    success: true,
    message: "Promotion retrieved successfully",
    data: promotion
  });
});

/**
 * Create promotion
 */
export const createPromotion = catchAsyncError(async (req: Request, res: Response) => {
  const { variant } = req.query;
  
  if (variant === 'length') {
    const promotionLength = await PromotionService.createPromotionLength(req.body);
    return res.status(201).json({
      success: true,
      message: "Promotion length created successfully",
      data: promotionLength
    });
  }

  const promotion = await PromotionService.createPromotion(req, req.body, req.user);
  
  res.status(201).json({
    success: true,
    message: "Promotion created successfully",
    data: promotion
  });
});

/**
 * Get promotions
 */
export const getPromotions = catchAsyncError(async (req: Request, res: Response) => {
  const { variant } = req.query;

  if (variant === 'BUSINESS_PARTNER') {
    const data = await PromotionService.getUserPromotions(req.user);
    return res.status(200).json({
      success: true,
      message: "User promotions retrieved successfully",
      data
    });
  }

  if (variant === 'length') {
    const lengths = await PromotionService.getPromotionLengths();
    return res.status(200).json({
      success: true,
      message: "Promotion lengths retrieved successfully",
      data: lengths
    });
  }

  const promotions = await PromotionService.getAllPromotions();
  
  res.status(200).json({
    success: true,
    message: "Promotions retrieved successfully",
    data: promotions
  });
});

/**
 * Update promotion length
 */
export const updatePromotionLength = catchAsyncError(async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Promotion length id is required",
    });
  }
  
  const promotionLength = await PromotionService.updatePromotionLength(id, req.body);
  
  res.status(200).json({
    success: true,
    message: "Promotion length updated successfully",
    data: promotionLength
  });
});

/**
 * Delete promotion
 */
export const deletePromotion = catchAsyncError(async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Promotion id is required",
    });
  }
  
  await PromotionService.deletePromotion(req, id);
  
  res.status(204).send();
});
