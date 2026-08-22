import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/preference-question.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type PreferenceQuestionFieldType = "text" | "textarea" | "select" | "radio" | "date" | "checkbox";
export type PreferenceQuestionVisibility = "public" | "private";

export type PreferenceQuestion = {
  id: string;
  label: string;
  fieldType: PreferenceQuestionFieldType;
  options: string[] | null;
  visibility: PreferenceQuestionVisibility;
  isActive: boolean;
  sortOrder: number;
  createdById: string | null;
  deletedById: string | null;
  isSystem: boolean;
  systemKey: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type CreateQuestionPayload = {
  label: string;
  fieldType: PreferenceQuestionFieldType;
  options?: string[];
  visibility: PreferenceQuestionVisibility;
  isActive?: boolean;
};

type UpdateQuestionPayload = Partial<CreateQuestionPayload> & { id: string };

export function usePreferenceQuestions(options: { recycleBinOpen?: boolean } = {}) {
  const queryClient = useQueryClient();

  const questionsQuery = useFetchData<PreferenceQuestion[]>({
    method: "GET",
    url: endpoints.PREFERENCE_QUESTIONS,
    queryKey: ["preference-questions"],
    enabled: true,
    forceRefresh: true,
  });

  const deletedQuestionsQuery = useFetchData<PreferenceQuestion[]>({
    method: "GET",
    url: endpoints.PREFERENCE_QUESTIONS_RECYCLE_BIN,
    queryKey: ["preference-questions", "recycle-bin"],
    enabled: !!options.recycleBinOpen,
    forceRefresh: true,
  });

  const invalidateQuestions = async () => {
    await queryClient.invalidateQueries({ queryKey: ["preference-questions"] });
  };

  const createQuestion = useMutation({
    mutationFn: async (payload: CreateQuestionPayload) => {
      const response = await axiosInstance.post<ApiSuccess<PreferenceQuestion>>(
        endpoints.PREFERENCE_QUESTIONS,
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateQuestions,
  });

  const updateQuestion = useMutation({
    mutationFn: async (payload: UpdateQuestionPayload) => {
      const { id, ...data } = payload;
      const response = await axiosInstance.put<ApiSuccess<PreferenceQuestion>>(
        endpoints.PREFERENCE_QUESTION(id),
        data,
      );
      return response.data.data;
    },
    onSuccess: invalidateQuestions,
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(
        endpoints.PREFERENCE_QUESTION(id),
      );
      return response.data;
    },
    onSuccess: invalidateQuestions,
  });

  const restoreQuestion = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.post<ApiSuccess<PreferenceQuestion>>(
        endpoints.PREFERENCE_QUESTION_RESTORE(id),
      );
      return response.data.data;
    },
    onSuccess: invalidateQuestions,
  });

  const hardDeleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(
        endpoints.PREFERENCE_QUESTION_PERMANENT(id),
      );
      return response.data;
    },
    onSuccess: invalidateQuestions,
  });

  const QUESTIONS_QUERY_KEY = ["preference-questions"];

  type ReorderItem = { id: string; sortOrder: number; visibility?: PreferenceQuestionVisibility };

  const reorderQuestions = useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      const response = await axiosInstance.post<ApiSuccess<PreferenceQuestion[]>>(
        endpoints.PREFERENCE_QUESTIONS_REORDER,
        { items },
      );
      return response.data.data;
    },
    onMutate: async (items: ReorderItem[]) => {
      await queryClient.cancelQueries({ queryKey: QUESTIONS_QUERY_KEY, exact: true });
      const previous = queryClient.getQueryData<ApiSuccess<PreferenceQuestion[]>>(QUESTIONS_QUERY_KEY);

      if (previous) {
        const patchById = new Map(items.map((item) => [item.id, item]));
        const nextData = previous.data.map((q) => {
          const patch = patchById.get(q.id);
          if (!patch) return q;
          return { ...q, sortOrder: patch.sortOrder, visibility: patch.visibility ?? q.visibility };
        });
        queryClient.setQueryData(QUESTIONS_QUERY_KEY, { ...previous, data: nextData });
      }

      return { previous };
    },
    onError: (_err, _items, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUESTIONS_QUERY_KEY, context.previous);
      }
    },
    onSettled: invalidateQuestions,
  });

  const questions = questionsQuery.data?.data ?? [];
  const deletedQuestions = deletedQuestionsQuery.data?.data ?? [];

  return {
    questionsDomain: {
      data: questions,
      isLoading: questionsQuery.isLoading,
      isSuccess: questionsQuery.isSuccess,
      isError: questionsQuery.isError,
      error: questionsQuery.error,
      refetch: questionsQuery.refetch,
    },
    deletedQuestionsDomain: {
      data: deletedQuestions,
      isLoading: deletedQuestionsQuery.isLoading,
      isSuccess: deletedQuestionsQuery.isSuccess,
      isError: deletedQuestionsQuery.isError,
      error: deletedQuestionsQuery.error,
      refetch: deletedQuestionsQuery.refetch,
    },
    actions: {
      createQuestion: createQuestion.mutateAsync,
      updateQuestion: updateQuestion.mutateAsync,
      deleteQuestion: deleteQuestion.mutateAsync,
      restoreQuestion: restoreQuestion.mutateAsync,
      hardDeleteQuestion: hardDeleteQuestion.mutateAsync,
      reorderQuestions: reorderQuestions.mutateAsync,
      isMutating:
        createQuestion.isPending ||
        updateQuestion.isPending ||
        deleteQuestion.isPending ||
        reorderQuestions.isPending,
      isRestoring: restoreQuestion.isPending,
      isHardDeleting: hardDeleteQuestion.isPending,
    },
  };
}
