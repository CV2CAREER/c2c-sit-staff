import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { Blog } from "../models/v1/blog.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { uploadBase64ToStorage, generateUniqueFilename } from "../utils/fileUpload";

const logger = getServiceLogger("blog-service");

export class BlogService {
  /**
   * Get all blog posts with filters
   */
  static async getAllBlogPosts(filters: { recycled?: boolean } = {}) {
    try {
      const whereClause: any = {};
      
      if (typeof filters.recycled === 'boolean') {
        whereClause.recycled = filters.recycled;
      }

      const posts = await Blog.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        raw: true
      });

      logger.info(`✅ Retrieved ${posts.length} blog posts`);
      return posts;
    } catch (error: any) {
      logger.error(`❌ Failed to get blog posts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get blog post by ID
   */
  static async getBlogPostById(id: string) {
    try {
      const post = await Blog.findByPk(id, { raw: true });
      
      if (!post) {
        throw new Error("Blog post not found");
      }

      // Increment view count async
      setImmediate(async () => {
        try {
          await Blog.increment('viewCount', { where: { id } });
        } catch (err) {
          logger.error(`❌ Failed to increment view count: ${err}`);
        }
      });

      logger.info(`✅ Retrieved blog post ${id}`);
      return post;
    } catch (error: any) {
      logger.error(`❌ Failed to get blog post: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new blog post
   */
  static async createBlogPost(req: any, data: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);

    try {
      // Auto upload featured image to Firebase Storage if base64
      if (data.featuredImage && data.featuredImage.startsWith('data:image/')) {
        const filename = generateUniqueFilename("blog-image.png");
        const uploadResult = await uploadBase64ToStorage(data.featuredImage, filename, {
          folder: "blog-images"
        });
        data.featuredImage = uploadResult.url;
      }

      const post = await Blog.create({
        ...data,
        author: user.email
      });

      // Send Slack Notification
      setImmediate(async () => {
        try {
          const message = `
📝 **New Blog Post Created** 📝
• Author: ${user.email}
• Title: ${post.title}
• Category: ${post.category || 'Uncategorized'}
• Published: ${post.isPublished ? '✅ Yes' : '⏳ Draft'}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Blog Post Created",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      logger.info(`✅ Blog post ${post.id} created by ${user.email}`);
      return post;
    } catch (error: any) {
      logger.error(`❌ Failed to create blog post: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update blog post
   */
  static async updateBlogPost(req: any, id: string, updates: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);

    try {
      // Auto upload featured image to Firebase Storage if base64
      if (updates.featuredImage && updates.featuredImage.startsWith('data:image/')) {
        const filename = generateUniqueFilename("blog-image.png");
        const uploadResult = await uploadBase64ToStorage(updates.featuredImage, filename, {
          folder: "blog-images"
        });
        updates.featuredImage = uploadResult.url;
      }

      const post = await Blog.findByPk(id);
      
      if (!post) {
        throw new Error("Blog post not found");
      }

      await post.update(updates);
      const updatedPost = await Blog.findByPk(id);

      // Send Slack Notification
      setImmediate(async () => {
        try {
          const updateSummary = Object.entries(updates)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join("\n• ");

          const message = `
✏️ **Blog Post Updated** ✏️
• Updated by: ${user.email}
• Post ID: ${id}
• Title: ${updatedPost?.title}
• Changes:
• ${updateSummary}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Blog Post Updated",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      logger.info(`✅ Blog post ${id} updated by ${user.email}`);
      return updatedPost;
    } catch (error: any) {
      logger.error(`❌ Failed to update blog post: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete blog post
   */
  static async deleteBlogPost(req: any, id: string, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);

    try {
      const post = await Blog.findByPk(id);
      
      if (!post) {
        throw new Error("Blog post not found");
      }

      const postData = post.toJSON();
      await post.destroy();

      // Send Slack Notification
      setImmediate(async () => {
        try {
          const message = `
🗑️ **Blog Post Deleted** 🗑️
• Deleted by: ${user.email}
• Post ID: ${id}
• Title: ${postData.title}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Blog Post Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      logger.info(`✅ Blog post ${id} deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to delete blog post: ${error.message}`);
      throw error;
    }
  }
}