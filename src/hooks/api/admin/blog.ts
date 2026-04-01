import { useFetchData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { IBlogPost, IBlogStats} from "@/types/blog.types";
import { useMemo } from "react";

export const useBlogQueries = (options?: { recycled?: boolean; id?: string }) => {
  const posts = useFetchData<IBlogPost[]>({
    method: "GET",
    url: endpoints.ADMIN_BLOG,
    params: { recycled: options?.recycled },
    queryKey: ["admin-blog-posts", options?.recycled ?? false],
    enabled: true,
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
    url: endpoints.ADMIN_FOLLOWERS, // Note: Using existing followers endpoint as proxy for blog stats if applicable, or we might need a dedicated one
    queryKey: ["admin-blog-stats"],
    enabled: true,
  });

  return useMemo(() => ({
    blogPostsDomain: {
      data: posts.data?.data || [],
      isLoading: posts.isLoading,
      isSuccess: posts.isSuccess,
      isError: posts.isError,
      isFetching: posts.isFetching,
      error: posts.error,
      refetch: posts.refetch,
    },
    blogPostByIdDomain: {
      data: postById.data?.data,
      isLoading: postById.isLoading,
      isSuccess: postById.isSuccess,
      isError: postById.isError,
      isFetching: postById.isFetching,
      error: postById.error,
      refetch: postById.refetch,
    },
    blogStatsDomain: {
      data: stats.data?.data,
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
      const response = await axiosInstance.patch(endpoints.ADMIN_BLOG_WITH_ID(id), values);
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
