"use client";
import React from "react";
import { CircularProgress } from "@mui/material";
import PostDetailsHero from "../_components/PostDetailsHero";
import StorySection from "../_components/StorySection";
import { useSearchParams } from "next/navigation";
import BlogListingNavbar from "../_components/Navbar";

// import BlogDetails from "../../../components/Blogging/PostDetails/PostDetails"

import { useBlogQueries } from "@/hooks/api/admin/blog";

const BlogDetailsPage = () => {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") || "";

  const { blogPostByIdDomain } = useBlogQueries({ id });
  const post = blogPostByIdDomain.data;

  if (blogPostByIdDomain.isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "20vh",
        }}
      >
        <CircularProgress />
        <span style={{ marginLeft: "10px", color: "#555" }}>
          Loading content...
        </span>
      </div>
    );
  }

  if (!post) {
    return <div>No content available.</div>;
  }

  return (
    <div className="max-w-full md:w-[1240px] w-full h-auto md:flex inline-block md:flex-col bg-[#EDFFFF] px-2 md:px-8 box-border gap-4">
      <BlogListingNavbar />
      <PostDetailsHero posts={post} />

      <div className="relative mt-8 mb-6 md:left-[168px]">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">{post.title}</h1>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      </div>

      <div className="w-full">
        <StorySection posts={post} />
      </div>
    </div>
  );
};

export default BlogDetailsPage;
