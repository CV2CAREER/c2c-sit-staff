import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { BlogService } from "../../services/blog.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("blog-controller");

/**
 * Get all blog posts
 */
export const getBlogPosts = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { recycled } = req.query;
    
    const filters: any = {};
    if (recycled === 'true') filters.recycled = true;
    if (recycled === 'false') filters.recycled = false;

    const posts = await BlogService.getAllBlogPosts(filters);
    
    res.apiSuccess(posts, "Blog posts retrieved successfully");
  } catch (error: any) {
    logger.error(`Failed to fetch blog posts: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

/**
 * Get blog post by ID
 */
export const getBlogPostById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.apiError(new ErrorHandler("Blog post ID is required", 400));
    }

    const post = await BlogService.getBlogPostById(id as string);
    
    res.apiSuccess(post, "Blog post retrieved successfully");
  } catch (error: any) {
    logger.error(`Failed to fetch blog post: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

/**
 * Create new blog post
 */
export const createBlogPost = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const post = await BlogService.createBlogPost(req, req.body, req.user);
    
    res.apiSuccess(post, "Blog post created successfully", 201);
  } catch (error: any) {
    logger.error(`Failed to create blog post: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

/**
 * Update blog post
 */
export const updateBlogPost = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.apiError(new ErrorHandler("Blog post ID is required", 400));
    }

    const updatedPost = await BlogService.updateBlogPost(req, id as string, req.body, req.user);
    
    res.apiSuccess(updatedPost, "Blog post updated successfully");
  } catch (error: any) {
    logger.error(`Failed to update blog post: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

/**
 * Delete blog post
 */
export const deleteBlogPost = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.apiError(new ErrorHandler("Blog post ID is required", 400));
    }

    await BlogService.deleteBlogPost(req, id as string, req.user);
    
    res.apiSuccess({}, "Blog post deleted successfully", 204);
  } catch (error: any) {
    logger.error(`Failed to delete blog post: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});