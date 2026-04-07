import { Response, Request } from "express";
import { QueryTypes } from "sequelize";
import { getSequelize } from "../../utils/sequelize";
import { sendSlackMessage } from "../../config/slack";

/**
 * Non-blocking Slack notification - fire and forget
 */
const sendSlackNotification = (user: any) => {
  sendSlackMessage({
    text: `Jobsite password for user ${user.full_name} has been updated successfully.\n*Success*: ExternalPassword field updated in database.\n*Immediate Impact*: User can now be dispatched with credentials for automated applications.\n*Next Step*: Proceed with credential dispatch if ready.`,
    channel: "CRY_WOLF",
  }).catch((error: Error) => {
    console.error("[Slack Notification Failed]", error.message);
  });
};

/**
 * POST /api/v1/admin/generate-password
 * Update external password for user
 */
export const generateExternalPassword = async (req: Request, res: Response) => {
  try {
    const { password, userId } = req.body as {
      password: string;
      userId: string;
    };

    if (!password || !userId) {
      return res.status(400).json({
        success: false,
        message: "Password and userId are required",
      });
    }

    // Check if user exists and get user data
    const sequelize = getSequelize();
    const userQuery = (await sequelize.query(
      `SELECT id, customer_id, full_name, external_password 
       FROM credentials 
       WHERE id = $1`,
      { replacements: [userId], type: QueryTypes.SELECT },
    )) as any[];

    if (userQuery.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userQuery[0];

    if (user.external_password) {
      return res.status(400).json({
        success: false,
        message: "External password already exists",
      });
    }

    // Update external password in PostgreSQL
    await sequelize.query(
      `UPDATE credentials 
       SET external_password = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      { replacements: [password, userId], type: QueryTypes.UPDATE },
    );

    console.log(
      `[External Password] CustomerId: ${user.customer_id}, Updated for user: ${user.full_name}`,
    );

    // Fire and forget Slack notification
    sendSlackNotification(user);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(
      "[External Password] Error occurred during password generation",
      error,
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
