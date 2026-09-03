import { Op } from "sequelize";
import { Chat } from "../../models/v1/chat.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("chat-service");

export class ChatService {
  /**
   * Get chats filtered by date (supports single date or date range)
   */
  static async getByDate(
    date: string,
    endDate?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: Chat[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit;
      
      let whereCondition: any = {};
      
      if (date && endDate) {
        // Date range query
        whereCondition.createdAt = {
          [Op.gte]: new Date(date),
          [Op.lt]: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))
        };
      } else if (date) {
        // Single date query
        const startOfDay = new Date(date);
        const endOfDay = new Date(new Date(date).setDate(new Date(date).getDate() + 1));
        
        whereCondition.createdAt = {
          [Op.gte]: startOfDay,
          [Op.lt]: endOfDay
        };
      }

      const { rows, count } = await Chat.findAndCountAll({
        where: whereCondition,
        attributes: ['id', 'sessionId', 'messages', 'clientId', 'createdAt', 'updatedAt'],
        include: [{
          association: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        raw: true,
        nest: true
      });

      logger.info(`✅ Fetched ${rows.length} chats for date: ${date}${endDate ? ` to ${endDate}` : ''}`);
      
      return {
        data: rows,
        total: count,
        page,
        limit
      };
    } catch (error: any) {
      logger.error(`❌ Failed to fetch chats by date: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get single chat by ID
   */
  static async getById(id: string): Promise<Chat | null> {
    try {
      const chat = await Chat.findByPk(id, {
        include: [{
          association: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        raw: true,
        nest: true
      });

      return chat;
    } catch (error: any) {
      logger.error(`❌ Failed to fetch chat ${id}: ${error.message}`);
      throw error;
    }
  }
}