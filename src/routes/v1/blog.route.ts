import { Router } from "express";
import {
  getBlogPosts,
  getBlogPostById,
  getBlogStats,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost
} from "../../controllers/v1/blog.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const blogRouterV1 = Router();

blogRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

blogRouterV1.get("/", getBlogPosts);
blogRouterV1.post("/", createBlogPost);
blogRouterV1.patch("/", updateBlogPost);
blogRouterV1.delete("/", deleteBlogPost);
blogRouterV1.get("/id", getBlogPostById);
blogRouterV1.get("/stats", getBlogStats);

export default blogRouterV1;
