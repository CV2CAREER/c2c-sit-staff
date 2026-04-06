import { Request, Response } from 'express';
import pool from '@/config/database';
import { sendSlackMessage } from '@/utils/sendSlackMessage';
import { SlackChannel } from '@/types/enum';

/**
 * Non-blocking Slack notification - fire and forget
 */
const sendSlackNotification = (user: any, req: Request) => {
  // Fire and forget - no await, no blocking
  sendSlackMessage(
    `Jobsite password for user ${user.full_name} has been updated successfully.
*Success*: ExternalPassword field updated in database.
*Immediate Impact*: User can now be dispatched with credentials for automated applications.
*Next Step*: Proceed with credential dispatch if ready.`,
    SlackChannel.CRY_WOLF,
    req,
    false,
    false,
    true,
    {
      node: 'DATABASE',
      prv: 'POSTGRESQL',
      sev: 'INFO',
      trigger: 'USER_ACTION',
      type: 'AUTH'
    }
  ).catch(error => {
    // Silent fail - log but don't crash
    console.error('[Slack Notification Failed]', error.message);
  });
};

/**
 * POST /api/v1/generate-password
 * Update external password for user
 */
export const generateExternalPassword = async (req: Request, res: Response) => {
  try {
    // Method validation
    if (req.method?.toLowerCase() !== 'post') {
      return res.status(405).json({ 
        success: false,
        message: 'Method not allowed' 
      });
    }

    // Extract and validate input
    const { password, userId } = req.body;

    if (!password || !userId) {
      return res.status(400).json({ 
        success: false,
        message: 'Password and userId are required' 
      });
    }

    // Check if user exists and get user data
    const userQuery = await pool.query(
      `SELECT id, customer_id, full_name, external_password 
       FROM credentials 
       WHERE id = $1`,
      [userId]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = userQuery.rows[0];

    // Check if external password already exists
    if (user.external_password) {
      return res.status(400).json({ 
        success: false,
        message: 'External password already exists' 
      });
    }

    // Update external password
    await pool.query(
      `UPDATE credentials 
       SET external_password = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      [password, userId]
    );

    // Log success
    console.log(`[External Password] Updated for user: ${user.customer_id} (ID: ${userId})`);

    // Fire and forget Slack notification - doesn't block response
    sendSlackNotification(user, req);

    // Return success response immediately
    return res.status(200).json({ 
      success: true,
      message: 'Password updated successfully' 
    });

  } catch (error) {
    // Log error but don't expose details to client
    console.error('[External Password] Error:', error);
    
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};
