import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { BlogService } from "../../services/blog.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("customer-blog-controller");

/**
 * Get published blog posts (public — no auth required)
 */
export const getPublishedBlogPosts = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const filters: { category?: string; search?: string } = {};
    if (typeof category === "string" && category.trim().length > 0) {
      filters.category = category.trim();
    }
    if (typeof search === "string" && search.trim().length > 0) {
      filters.search = search.trim();
    }

    const posts = await BlogService.getPublishedBlogPosts(filters);

    res.apiSuccess(posts, "Blog posts retrieved successfully");
  } catch (error: any) {
    logger.error(`Failed to fetch published blog posts: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

/**
 * Get a single published blog post by slug (public — no auth required)
 */
export const getPublishedBlogPostBySlug = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
      return res.apiError(new ErrorHandler("Slug is required", 400));
    }

    const post = await BlogService.getPublishedBlogPostBySlug(slug.trim());

    res.apiSuccess(post, "Blog post retrieved successfully");
  } catch (error: any) {
    if (error.message === "Blog post not found") {
      return res.apiError(new ErrorHandler("Blog post not found", 404));
    }
    logger.error(`Failed to fetch published blog post: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});
