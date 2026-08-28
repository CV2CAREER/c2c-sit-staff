import { useFetchData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { IBlogPost, IBlogStats} from "@/types/blog.types";
import { useMemo } from "react";

const normalizeBlogStatus = (rawStatus: any, scheduledDate?: string) => {
  if (typeof rawStatus === "string" && rawStatus.trim().length > 0) {
    return rawStatus as IBlogPost["status"];
  }

  if (scheduledDate && new Date(scheduledDate).getTime() > Date.now()) {
    return "Scheduled" as const;
  }

  return "Draft" as const;
};

const normalizeBlogPost = (post: any): IBlogPost => {
  const resolvedScheduledDate =
    post?.scheduledDate || (post?.publishedAt && new Date(post.publishedAt).getTime() > Date.now()
      ? post.publishedAt
      : undefined);

  return {
    _id: post?._id || post?.id || "",
    id: post?.id || post?._id || "",
    title: post?.title || "",
    body: post?.body || post?.content || "",
    category: post?.category || "",
    location: post?.location || "",
    option: post?.option || (Array.isArray(post?.tags) ? (post.tags[0] || "") : ""),
    description: post?.description || post?.excerpt || "",
    image: post?.image || post?.featuredImage || "",
    featuredImage: post?.featuredImage || post?.image || "",
    status: normalizeBlogStatus(post?.status, resolvedScheduledDate),
    recycled: Boolean(post?.recycled),
    scheduledDate: resolvedScheduledDate,
    author: post?.author || "",
    userId: post?.userId || "",
    createdAt: post?.createdAt || new Date().toISOString(),
    updatedAt: post?.updatedAt,
  };
};

const normalizeBlogStats = (stats: any): IBlogStats => ({
  followers: {
    value: Number(stats?.followers?.value || 0),
    trend: Number(stats?.followers?.trend || 0),
  },
  posts: {
    value: Number(stats?.posts?.value || 0),
    trend: Number(stats?.posts?.trend || 0),
  },
  comments: {
    value: Number(stats?.comments?.value || 0),
    trend: Number(stats?.comments?.trend || 0),
  },
});

export const useBlogQueries = (options?: { recycled?: boolean; id?: string }) => {
  const posts = useFetchData<IBlogPost[]>({
    method: "GET",
    url: endpoints.ADMIN_BLOG,
    params: { recycled: options?.recycled },
    queryKey: ["admin-blog-posts", options?.recycled ?? false],
    enabled: !options?.id,
  });

  const postById = useFetchData<IBlogPost>({
    method: "GET",
    url: endpoints.ADMIN_BLOG,
    params: { id: options?.id },
    queryKey: ["admin-blog-post", options?.id],
    enabled: !!options?.id,
  });

  const stats = useFetchData<IBlogStats>({
    method: "GET",
    url: endpoints.ADMIN_BLOG_STATS,
    queryKey: ["admin-blog-stats"],
    enabled: true,
  });

  return useMemo(() => ({
    blogPostsDomain: {
      data: ((posts.data?.data || []) as any[]).map(normalizeBlogPost),
      isLoading: posts.isLoading,
      isSuccess: posts.isSuccess,
      isError: posts.isError,
      isFetching: posts.isFetching,
      error: posts.error,
      refetch: posts.refetch,
    },
    blogPostByIdDomain: {
      data: postById.data?.data ? normalizeBlogPost(postById.data.data as any) : undefined,
      isLoading: postById.isLoading,
      isSuccess: postById.isSuccess,
      isError: postById.isError,
      isFetching: postById.isFetching,
      error: postById.error,
      refetch: postById.refetch,
    },
    blogStatsDomain: {
      data: normalizeBlogStats(stats.data?.data || {}),
      isLoading: stats.isLoading,
      isSuccess: stats.isSuccess,
      isError: stats.isError,
      isFetching: stats.isFetching,
      error: stats.error,
      refetch: stats.refetch,
    }
  }), [posts, postById, stats]);
};

export const useBlogMutations = () => {
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationKey: ["admin-create-blog-post"],
    mutationFn: async (values: Partial<IBlogPost>) => {
      const response = await axiosInstance.post(endpoints.ADMIN_BLOG, values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    }
  });

  const updatePost = useMutation({
    mutationKey: ["admin-update-blog-post"],
    mutationFn: async ({ id, values }: { id: string; values: Partial<IBlogPost> }) => {
      const response = await axiosInstance.patch(endpoints.ADMIN_BLOG_EDIT_POST(id), values);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-post", variables.id] });
    }
  });

  const deletePostPermanently = useMutation({
    mutationKey: ["admin-delete-blog-post"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(endpoints.ADMIN_BLOG_WITH_ID(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    }
  });

  const softDeletePost = useMutation({
    mutationKey: ["admin-soft-delete-blog-post"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.patch(endpoints.ADMIN_BLOG_WITH_ID(id), { recycled: true });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    }
  });

  const restorePost = useMutation({
    mutationKey: ["admin-restore-blog-post"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.patch(endpoints.ADMIN_BLOG_WITH_ID(id), { recycled: false });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    }
  });

  return {
    createPost,
    updatePost,
    deletePostPermanently,
    softDeletePost,
    restorePost,
  };
};
