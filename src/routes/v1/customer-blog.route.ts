import { Router } from "express";
import {
  getPublishedBlogPosts,
  getPublishedBlogPostBySlug,
} from "../../controllers/v1/customer-blog.controller";

const customerBlogRouterV1 = Router();

customerBlogRouterV1.get("/", getPublishedBlogPosts);
customerBlogRouterV1.get("/slug", getPublishedBlogPostBySlug);

export default customerBlogRouterV1;
