import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faqService } from "@/services/faq.service";
import type {
  FaqArticle,
  FaqCategory,
  FaqGap,
  SaveFaqArticlePayload,
} from "@/types/faq.types";

export const FAQ_CATEGORIES_QUERY_KEY = ["admin", "faq", "categories"];
export const FAQ_ARTICLES_QUERY_KEY = ["admin", "faq", "articles"];
export const FAQ_GAPS_QUERY_KEY = ["admin", "faq", "gaps"];

export function useFaq() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery<FaqCategory[], Error>({
    queryKey: FAQ_CATEGORIES_QUERY_KEY,
    queryFn: () => faqService.listCategories(),
  });

  const articlesQuery = useQuery<FaqArticle[], Error>({
    queryKey: FAQ_ARTICLES_QUERY_KEY,
    queryFn: () => faqService.listArticles(),
  });

  // Any article change moves category counts too, so refresh both lists.
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: FAQ_ARTICLES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: FAQ_CATEGORIES_QUERY_KEY }),
    ]);

  const saveArticle = useMutation<
    FaqArticle,
    Error,
    SaveFaqArticlePayload & { id?: string }
  >({
    mutationFn: ({ id, ...payload }) =>
      id ? faqService.updateArticle({ id, ...payload }) : faqService.createArticle(payload),
    onSuccess: invalidate,
  });

  const submitForReview = useMutation<FaqArticle, Error, string>({
    mutationFn: faqService.submitForReview,
    onSuccess: invalidate,
  });

  const approve = useMutation<FaqArticle, Error, string>({
    mutationFn: faqService.approve,
    onSuccess: invalidate,
  });

  const returnToDraft = useMutation<FaqArticle, Error, string>({
    mutationFn: faqService.returnToDraft,
    onSuccess: invalidate,
  });

  const removeArticle = useMutation<{ id: string }, Error, string>({
    mutationFn: faqService.remove,
    onSuccess: invalidate,
  });

  // New gaps arrive whenever a bot declines, so keep the log fresh.
  const gapsQuery = useQuery<FaqGap[], Error>({
    queryKey: FAQ_GAPS_QUERY_KEY,
    queryFn: () => faqService.listGaps(),
    refetchInterval: 60000,
  });

  const updateGap = useMutation<
    { id: string; status: FaqGap["status"] },
    Error,
    { id: string; status: FaqGap["status"]; faqArticleId?: string }
  >({
    mutationFn: ({ id, status, faqArticleId }) => faqService.updateGap(id, status, faqArticleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAQ_GAPS_QUERY_KEY }),
  });

  const createCategory = useMutation<FaqCategory, Error, string>({
    mutationFn: faqService.createCategory,
    onSuccess: invalidate,
  });

  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const published = useMemo(
    () => articles.filter((article) => article.status === "published"),
    [articles],
  );
  // In-review first — those are waiting on a decision; drafts are still being written.
  const reviewQueue = useMemo(
    () =>
      articles
        .filter((article) => article.status !== "published")
        .sort((a, b) => Number(b.status === "in_review") - Number(a.status === "in_review")),
    [articles],
  );

  return {
    articlesDomain: {
      published,
      reviewQueue,
      isLoading: articlesQuery.isLoading,
      isError: articlesQuery.isError,
      error: articlesQuery.error,
      refetch: articlesQuery.refetch,
    },
    gapsDomain: {
      data: gapsQuery.data ?? [],
      isLoading: gapsQuery.isLoading,
      error: gapsQuery.error,
      refetch: gapsQuery.refetch,
    },
    categoriesDomain: {
      data: categories,
      isLoading: categoriesQuery.isLoading,
      isError: categoriesQuery.isError,
      error: categoriesQuery.error,
      refetch: categoriesQuery.refetch,
    },
    actions: {
      saveArticle: saveArticle.mutateAsync,
      isSavingArticle: saveArticle.isPending,
      submitForReview: submitForReview.mutateAsync,
      approve: approve.mutateAsync,
      returnToDraft: returnToDraft.mutateAsync,
      removeArticle: removeArticle.mutateAsync,
      isUpdatingStatus:
        submitForReview.isPending ||
        approve.isPending ||
        returnToDraft.isPending ||
        removeArticle.isPending,
      updateGap: updateGap.mutateAsync,
      isUpdatingGap: updateGap.isPending,
      createCategory: createCategory.mutateAsync,
      isCreatingCategory: createCategory.isPending,
    },
  };
}
