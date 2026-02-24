import { SERVER_URI } from "@/constants/env";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";

// FOR POST, PUT, DELETE requests
interface MutationOptions<TResponse, TRequest = unknown> {
  mutationKey: (string | number)[];
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  params?: string;
  paramKey?: keyof TRequest;
  headers?: Record<string, string>;
  onSuccess: (data: ApiSuccess<TResponse>) => void;
  onError: (error: ApiError) => void;
}

export function useMutateData<TResponse, TRequest = unknown>({
  url,
  method,
  headers,
  params,
  paramKey,
  mutationKey,
  onError,
  onSuccess,
}: MutationOptions<TResponse, TRequest>) {
  return useMutation<ApiSuccess<TResponse>, ApiError, TRequest>({
    mutationKey: [...mutationKey],
    mutationFn: async (data: TRequest) => {
      try {
        let dynamicParams = params;

        if (
          paramKey &&
          typeof data === "object" &&
          data !== null &&
          paramKey &&
          paramKey in data
        ) {
          const key = paramKey as string;
          const value = (data as Record<string, any>)[key];
          dynamicParams = `/${value}`;
        }

        const finalUrl = dynamicParams
          ? `${SERVER_URI}${url}${dynamicParams}`
          : `${SERVER_URI}${url}`;

        const config: any = {
          method,
          url: finalUrl,
          data,
          withCredentials: true,
          headers: headers ?? {},
        };

        const response = await axiosInstance<ApiSuccess<TResponse>>(config);

        // check if response structure is correct
        if (!response.data || typeof response.data.success !== "boolean") {
          throw {
            success: false,
            message: "Invalid API response structure",
            statusCode: 500,
            data: null,
          } satisfies ApiError;
        }

        return response.data;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          throw (
            err.response?.data || {
              success: false,
              message: err.message,
              statusCode: err.response?.status || 500,
            }
          );
        }

        throw err;
      }
    },
    onSuccess: (data) => {
      if (!data.success) {
        onError(data as ApiError);
        return;
      }

      onSuccess(data);
    },
    onError: (error: ApiError) => {
      onError(error);
    },
  });
}

interface FetchOptions {
  url: string;
  method: "GET";
  queryKey: (string | number)[];
  enabled: boolean;
  params?: string;
  staleEarly?: boolean;
  forceRefresh?: boolean;
  initialData?: any;
}

// for GET requests
export function useFetchData<T>({
  url,
  queryKey,
  method,
  enabled,
  params,
  staleEarly = false,
  initialData,
  forceRefresh = false,
}: FetchOptions) {
  return useQuery<ApiSuccess<T>, ApiError>({
    queryKey: [...queryKey],
    queryFn: async () => {
      try {
        const config: any = {
          method,
          url: params ? `${SERVER_URI}${url}${params}` : `${SERVER_URI}${url}`,
          withCredentials: true,
        };

        const response = await axiosInstance(config);

        // validate response structure
        if (!response.data || typeof response.data.success !== "boolean") {
          throw {
            success: false,
            message: "Invalid API response structure",
            statusCode: 500,
            data: null,
          } satisfies ApiError;
        }

        return response.data;
      } catch (error: any) {
        const fallbackError: ApiError = {
          success: false,
          message: "Unexpected error",
          statusCode: 500,
          data: null,
        };

        if (axios.isAxiosError(error) && error.response?.data) {
          const data = error.response.data;
          throw {
            success: false,
            message: data.message,
            statusCode: data.statusCode,
            data: null,
          } satisfies ApiError;
        } else {
          throw fallbackError satisfies ApiError;
        }
      }
    },
    // staleTime,
    enabled,
    staleTime: forceRefresh ? 0 : staleEarly ? 1000 * 60 * 5 : Infinity,
    gcTime: staleEarly ? 1000 * 60 * 5 : 1000 * 60 * 30,
    retry: false, // Retry once on failure
    initialData:
      initialData != null
        ? ({
            success: true,
            message: "Seeded from state",
            data: initialData as T,
            statusCode: 200,
          } satisfies ApiSuccess<T>)
        : undefined,
  });
}
