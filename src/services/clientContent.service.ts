import axios from "axios";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import type { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import type {
  ClientContentSection,
  UpdateClientContentPayload,
} from "@/types/clientContent.types";

/** Surfaces the API's own message so callers can render it verbatim. */
function toError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as ApiError | undefined)?.message;
    return new Error(message || error.message || fallback);
  }
  return error instanceof Error ? error : new Error(fallback);
}

async function list(): Promise<ClientContentSection[]> {
  try {
    const response = await axiosInstance.get<ApiSuccess<ClientContentSection[]>>(
      endpoints.ADMIN_CLIENT_CONTENT,
    );
    return response.data.data;
  } catch (error) {
    throw toError(error, "We could not load the content sections.");
  }
}

async function update({
  id,
  ...body
}: UpdateClientContentPayload): Promise<ClientContentSection> {
  try {
    const response = await axiosInstance.patch<ApiSuccess<ClientContentSection>>(
      endpoints.ADMIN_CLIENT_CONTENT_BY_ID(id),
      body,
    );
    return response.data.data;
  } catch (error) {
    throw toError(error, "Failed to save content.");
  }
}

export const clientContentService = { list, update };
