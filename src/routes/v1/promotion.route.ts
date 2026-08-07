import { Router } from "express";
import {
  getPromotionByCode,
  createPromotion,
  getPromotions,
  updatePromotionLength,
  deletePromotion
} from "../../controllers/v1/promotion.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const promotionRouterV1 = Router();

promotionRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

promotionRouterV1.route("/")
  .get(getPromotions)
  .post(createPromotion)
  .patch(updatePromotionLength)
  .delete(deletePromotion);

promotionRouterV1.get("/public", getPromotionByCode);

export default promotionRouterV1;