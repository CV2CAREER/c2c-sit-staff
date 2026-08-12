import { User } from "../models/v1/user.model";
import { Plan } from "../models/v1/plan.model";
import { Op } from "sequelize";
import ErrorHandler from "./errorHandler";
import { ServiceHistory } from "../types/userdocument.types";
import { getServiceLogger } from "./createLogger";
import { fieldEncryption } from "./field-encryption";

const logger = getServiceLogger("user-helper");

export const hopeUserExists = async (email: string) => {
  const userId = await fieldEncryption.findUserByEmail(email);
  if (!userId) throw new ErrorHandler("No record of this account", 404);
  const user = await User.findByPk(userId);
  if (!user) throw new ErrorHandler("No record of this account", 404);
  return user;
};

export const hopeUserIdExists = async (id: string) => {
  const user = await User.findByPk(id);

  if (!user) throw new ErrorHandler("No record of this account", 404);

  return user;
};

export const updateServiceHistory = async (userId: string, plan: string) => {
  try {
    logger.info("Starting updateServiceHistory...");
    logger.info(`User ID: ${userId}`);
    logger.info(`New Plan: ${plan}`);

    // Get user with selectedPlan and serviceHistory
    const user = await User.findByPk(userId);

    const userPlan = await Plan.findOne({
      where: {
        userId: userId,
        expiresAt: { [Op.gte]: new Date() },
      },
    });

    if (!user) {
      logger.warn("User not found.");
      return;
    }

    const history = user.serviceHistory || [];

    const previousPlan = history.length ? history[history.length - 1].to : null;

    if (previousPlan !== plan) {
      const transition: ServiceHistory = {
        to: plan,
        date: new Date(),
        from: previousPlan || user.selectedPlan || userPlan?.title || "",
      };

      user.serviceHistory = [...(user.serviceHistory || []), transition];

      await user.save();
      logger.info("Service history updated successfully.");
    } else {
      logger.info("No change in plan. Service history remains unchanged.");
    }
  } catch (error) {
    logger.error(`Error updating service history: ${error}`);
  }
};
