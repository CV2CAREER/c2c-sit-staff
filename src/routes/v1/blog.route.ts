import { Router } from "express";
import {
  getBlogPosts,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost
} from "../../controllers/v1/blog.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const blogRouterV1 = Router();

blogRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

blogRouterV1.get("/", getBlogPosts);
blogRouterV1.post("/", createBlogPost);
blogRouterV1.patch("/", updateBlogPost);
blogRouterV1.delete("/", deleteBlogPost);
blogRouterV1.get("/id", getBlogPostById);

export default blogRouterV1;