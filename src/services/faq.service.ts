import axios from "axios";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import type { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import type {
  FaqArticle,
  FaqCategory,
  FaqGap,
  SaveFaqArticlePayload,
} from "@/types/faq.types";

/** Surfaces the API's own message so callers can render it verbatim. */
function toError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as ApiError | undefined)?.message;
    return new Error(message || error.message || fallback);
  }
  return error instanceof Error ? error : new Error(fallback);
}

async function request<T>(run: () => Promise<{ data: ApiSuccess<T> }>, fallback: string) {
  try {
    const response = await run();
    return response.data.data;
  } catch (error) {
    throw toError(error, fallback);
  }
}

const listCategories = () =>
  request<FaqCategory[]>(
    () => axiosInstance.get(endpoints.ADMIN_FAQ_CATEGORIES),
    "We could not load the FAQ categories.",
  );

const createCategory = (name: string) =>
  request<FaqCategory>(
    () => axiosInstance.post(endpoints.ADMIN_FAQ_CATEGORIES, { name }),
    "Failed to add the category.",
  );

const listArticles = () =>
  request<FaqArticle[]>(
    () => axiosInstance.get(endpoints.ADMIN_FAQ_ARTICLES),
    "We could not load the FAQ articles.",
  );

const createArticle = (payload: SaveFaqArticlePayload) =>
  request<FaqArticle>(
    () => axiosInstance.post(endpoints.ADMIN_FAQ_ARTICLES, payload),
    "Failed to save the FAQ.",
  );

const updateArticle = ({ id, ...payload }: SaveFaqArticlePayload & { id: string }) =>
  request<FaqArticle>(
    () => axiosInstance.patch(endpoints.ADMIN_FAQ_ARTICLE_BY_ID(id), payload),
    "Failed to save the FAQ.",
  );

const submitForReview = (id: string) =>
  request<FaqArticle>(
    () => axiosInstance.post(`${endpoints.ADMIN_FAQ_ARTICLE_BY_ID(id)}/submit`),
    "Failed to send the FAQ for review.",
  );

const approve = (id: string) =>
  request<FaqArticle>(
    () => axiosInstance.post(`${endpoints.ADMIN_FAQ_ARTICLE_BY_ID(id)}/approve`),
    "Failed to publish the FAQ.",
  );

const returnToDraft = (id: string) =>
  request<FaqArticle>(
    () => axiosInstance.post(`${endpoints.ADMIN_FAQ_ARTICLE_BY_ID(id)}/return`),
    "Failed to send the FAQ back to draft.",
  );

const remove = (id: string) =>
  request<{ id: string }>(
    () => axiosInstance.delete(endpoints.ADMIN_FAQ_ARTICLE_BY_ID(id)),
    "Failed to delete the FAQ.",
  );

const listGaps = () =>
  request<FaqGap[]>(
    () => axiosInstance.get(endpoints.ADMIN_FAQ_GAPS),
    "We could not load the Gap Log.",
  );

const updateGap = (id: string, status: FaqGap["status"], faqArticleId?: string) =>
  request<{ id: string; status: FaqGap["status"] }>(
    () => axiosInstance.patch(endpoints.ADMIN_FAQ_GAP_BY_ID(id), { status, faqArticleId }),
    "Failed to update the gap.",
  );

export const faqService = {
  listGaps,
  updateGap,
  listCategories,
  createCategory,
  listArticles,
  createArticle,
  updateArticle,
  submitForReview,
  approve,
  returnToDraft,
  remove,
};
