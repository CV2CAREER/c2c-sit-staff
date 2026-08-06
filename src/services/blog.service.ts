import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { Blog } from "../models/v1/blog.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { generateUniqueFilename, uploadBase64ToStorage } from "../utils/fileUpload";

const logger = getServiceLogger("blog-service");

const parseDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const normalizeStatus = (
  status: unknown,
  isPublished?: boolean,
  publishedAt?: Date | null,
): "Draft" | "Published" | "Scheduled" => {
  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();
    if (normalized === "draft") return "Draft";
    if (normalized === "published") return "Published";
    if (normalized === "scheduled") return "Scheduled";
  }

  if (publishedAt && publishedAt.getTime() > Date.now()) {
    return "Scheduled";
  }

  if (isPublished) {
    return "Published";
  }

  return "Draft";
};

const toLegacyBlogPost = (post: Blog | any) => {
  const source = typeof post?.toJSON === "function" ? post.toJSON() : post;
  const publishedAt = parseDate(source?.publishedAt);
  const option =
    Array.isArray(source?.tags) && source.tags.length > 0 && typeof source.tags[0] === "string"
      ? source.tags[0]
      : "";
  const status = normalizeStatus(source?.status, Boolean(source?.isPublished), publishedAt);
  const scheduledDate = status === "Scheduled" && publishedAt ? publishedAt.toISOString() : undefined;

  return {
    _id: source.id,
    id: source.id,
    title: source.title ?? "",
    body: source.content ?? "",
    category: source.category ?? "",
    location: source.location ?? "",
    option,
    description: source.excerpt ?? "",
    image: source.featuredImage ?? "",
    featuredImage: source.featuredImage ?? "",
    status,
    recycled: Boolean(source.recycled),
    scheduledDate,
    author: source.author ?? "",
    userId: source.userId ?? "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    viewCount: source.viewCount ?? 0,
  };
};

const toCreatePayload = (data: any) => {
  const body = data?.body ?? data?.content;
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new Error("body is required");
  }

  const scheduledDate = parseDate(data?.scheduledDate);
  const status = normalizeStatus(data?.status, data?.isPublished, scheduledDate);
  const isPublished = status === "Published";
  const publishedAt = status === "Draft" ? null : scheduledDate ?? new Date();

  const optionValue =
    typeof data?.option === "string" && data.option.trim().length > 0
      ? data.option.trim()
      : "";

  return {
    title: typeof data?.title === "string" ? data.title.trim() : "",
    slug:
      typeof data?.slug === "string" && data.slug.trim().length > 0
        ? data.slug.trim()
        : null,
    excerpt: typeof data?.description === "string" ? data.description : data?.excerpt ?? "",
    content: body,
    author: data?.author ?? "",
    featuredImage: data?.featuredImage ?? data?.image ?? null,
    category: typeof data?.category === "string" ? data.category : "",
    tags: optionValue ? [optionValue] : [],
    isPublished,
    recycled: Boolean(data?.recycled),
    publishedAt,
  };
};

const toUpdatePayload = (updates: any, currentPost: Blog) => {
  const current = currentPost.toJSON();
  const merged = {
    ...current,
    ...updates,
  } as any;

  const scheduledDate = parseDate(merged?.scheduledDate) ?? parseDate(merged?.publishedAt);
  const status = normalizeStatus(merged?.status, merged?.isPublished, scheduledDate);
  const isPublished = status === "Published";
  const publishedAt = status === "Draft" ? null : scheduledDate ?? new Date();

  const optionValue =
    typeof merged?.option === "string" && merged.option.trim().length > 0
      ? merged.option.trim()
      : Array.isArray(current.tags) && current.tags.length > 0
        ? current.tags[0]
        : "";

  const payload: Record<string, unknown> = {
    title: typeof merged?.title === "string" ? merged.title.trim() : current.title,
    excerpt:
      typeof merged?.description === "string"
        ? merged.description
        : merged?.excerpt ?? current.excerpt,
    content:
      typeof merged?.body === "string"
        ? merged.body
        : typeof merged?.content === "string"
          ? merged.content
          : current.content,
    category:
      typeof merged?.category === "string" ? merged.category : current.category,
    featuredImage:
      merged?.featuredImage ?? merged?.image ?? current.featuredImage ?? null,
    tags: optionValue ? [optionValue] : [],
    recycled: Boolean(merged?.recycled),
    isPublished,
    publishedAt,
  };

  if (typeof merged?.slug === "string") {
    payload.slug = merged.slug.trim();
  }

  return payload;
};

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
};

export class BlogService {
  static async getAllBlogPosts(filters: { recycled?: boolean } = {}) {
    try {
      const whereClause: any = {};

      if (typeof filters.recycled === "boolean") {
        whereClause.recycled = filters.recycled;
      }

      const posts = await Blog.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
      });

      return posts.map(toLegacyBlogPost);
    } catch (error: any) {
      logger.error(`Failed to get blog posts: ${error.message}`);
      throw error;
    }
  }

  static async getBlogPostById(id: string) {
    try {
      const post = await Blog.findByPk(id);

      if (!post) {
        throw new Error("Blog post not found");
      }

      setImmediate(async () => {
        try {
          await Blog.increment("viewCount", { where: { id } });
        } catch (err) {
          logger.error(`Failed to increment view count: ${err}`);
        }
      });

      return toLegacyBlogPost(post);
    } catch (error: any) {
      logger.error(`Failed to get blog post: ${error.message}`);
      throw error;
    }
  }

  static async getPublishedBlogPosts(filters: { category?: string; search?: string } = {}) {
    try {
      const whereClause: any = {
        isPublished: true,
        recycled: false,
      };

      if (filters.category && filters.category !== "All") {
        whereClause.category = filters.category;
      }

      if (filters.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        whereClause[Op.or] = [
          { title: { [Op.iLike]: searchLower } },
          { excerpt: { [Op.iLike]: searchLower } },
          { category: { [Op.iLike]: searchLower } },
        ];
      }

      const posts = await Blog.findAll({
        where: whereClause,
        order: [["publishedAt", "DESC"]],
        attributes: [
          "id",
          "title",
          "slug",
          "excerpt",
          "content",
          "author",
          "featuredImage",
          "category",
          "tags",
          "publishedAt",
          "viewCount",
        ],
      });

      return posts.map(toLegacyBlogPost);
    } catch (error: any) {
      logger.error(`Failed to get published blog posts: ${error.message}`);
      throw error;
    }
  }

  static async getPublishedBlogPostBySlug(slug: string) {
    try {
      const post = await Blog.findOne({
        where: {
          slug,
          isPublished: true,
          recycled: false,
        },
      });

      if (!post) {
        throw new Error("Blog post not found");
      }

      setImmediate(async () => {
        try {
          await Blog.increment("viewCount", { where: { id: post.id } });
        } catch (err) {
          logger.error(`Failed to increment view count: ${err}`);
        }
      });

      return toLegacyBlogPost(post);
    } catch (error: any) {
      logger.error(`Failed to get published blog post by slug: ${error.message}`);
      throw error;
    }
  }

  static async getBlogStats() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentPosts, previousPosts] = await Promise.all([
      Blog.count({
        where: {
          recycled: false,
          createdAt: {
            [Op.gte]: last30Days,
          },
        },
      }),
      Blog.count({
        where: {
          recycled: false,
          createdAt: {
            [Op.gte]: previous30Days,
            [Op.lt]: last30Days,
          },
        },
      }),
    ]);

    const totalPosts = await Blog.count({ where: { recycled: false } });

    return {
      followers: {
        value: 0,
        trend: 0,
      },
      posts: {
        value: totalPosts,
        trend: calculateTrend(currentPosts, previousPosts),
      },
      comments: {
        value: 0,
        trend: 0,
      },
    };
  }

  static async createBlogPost(req: any, data: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);

    try {
      const payload = toCreatePayload(data);

      if (
        payload.featuredImage &&
        typeof payload.featuredImage === "string" &&
        payload.featuredImage.startsWith("data:image/")
      ) {
        const filename = generateUniqueFilename("blog-image.png");
        const uploadResult = await uploadBase64ToStorage(payload.featuredImage, filename, {
          folder: "blog-images",
        });
        payload.featuredImage = uploadResult.url;
      }

      if (!payload.author) {
        payload.author = user?.email ?? "Unknown";
      }

      const post = await Blog.create(payload as any);

      setImmediate(async () => {
        try {
          const message = `
New Blog Post Created
• Author: ${user.email}
• Title: ${post.title}
• Category: ${post.category || "Uncategorized"}
• Published: ${post.isPublished ? "Yes" : "No"}
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
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return toLegacyBlogPost(post);
    } catch (error: any) {
      logger.error(`Failed to create blog post: ${error.message}`);
      throw error;
    }
  }

  static async updateBlogPost(req: any, id: string, updates: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);

    try {
      const post = await Blog.findByPk(id);

      if (!post) {
        throw new Error("Blog post not found");
      }

      const payload = toUpdatePayload(updates, post);

      if (
        payload.featuredImage &&
        typeof payload.featuredImage === "string" &&
        payload.featuredImage.startsWith("data:image/")
      ) {
        const filename = generateUniqueFilename("blog-image.png");
        const uploadResult = await uploadBase64ToStorage(payload.featuredImage, filename, {
          folder: "blog-images",
        });
        payload.featuredImage = uploadResult.url;
      }

      await post.update(payload);

      setImmediate(async () => {
        try {
          const message = `
Blog Post Updated
• Updated by: ${user.email}
• Post ID: ${id}
• Title: ${post.title}
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
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return toLegacyBlogPost(post);
    } catch (error: any) {
      logger.error(`Failed to update blog post: ${error.message}`);
      throw error;
    }
  }

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

      setImmediate(async () => {
        try {
          const message = `
Blog Post Deleted
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
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return true;
    } catch (error: any) {
      logger.error(`Failed to delete blog post: ${error.message}`);
      throw error;
    }
  }
}
