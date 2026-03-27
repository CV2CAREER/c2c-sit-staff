import {
  ZOHO_BASE_URI,
  ZOHO_BOOKS_ACTIVE_AGGREGATORS_FIELD_API_NAME,
  ZOHO_BOOKS_ACTIVE_SUBSCRIPTIONS_FIELD_API_NAME,
  ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME,
  ZOHO_BOOKS_GENERATED_AT_FIELD_API_NAME,
  ZOHO_BOOKS_TOTAL_USERS_FIELD_API_NAME,
  ZOHO_BOOKS_VERIFIED_AGGREGATOR_LINKS_FIELD_API_NAME,
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_OAUTH_URI,
  ZOHO_ORG_ID,
  ZOHO_REDIRECT_URI,
  ZOHO_REFRESH_TOKEN,
} from "../config/env";
import { getServiceLogger } from "../utils/createLogger";

export interface ZohoBusinessSnapshotPayload {
  summaryDate: string;
  generatedAt: string;
  metrics: {
    totalUsers: number;
    activeAggregators: number;
    activeSubscriptions: number;
    verifiedAggregatorLinks: number;
  };
}

interface ZohoAccessTokenResponse {
  access_token?: string;
  api_domain?: string;
  expires_in?: number;
  error?: string;
}

interface ZohoModuleRecord {
  module_record_id?: string;
  record_name?: string;
  [key: string]: unknown;
}

interface ZohoModuleRecordListResponse {
  code?: number;
  message?: string;
  module_record?: ZohoModuleRecord[];
}

interface ZohoModuleMutationResponse {
  code?: number;
  message?: string;
  module_record?: ZohoModuleRecord | ZohoModuleRecord[];
}

export interface ZohoSyncResult {
  skipped: boolean;
  action?: "created" | "updated";
  moduleRecordId?: string;
  message: string;
}

const logger = getServiceLogger("zoho-books-service");

let cachedAccessToken: string | null = null;
let cachedApiDomain: string | null = null;
let accessTokenExpiresAt = 0;

const ZOHO_OAUTH_FALLBACK_URI = "https://accounts.zoho.com";
const ZOHO_API_FALLBACK_BASE_URI = "https://www.zohoapis.com";

const sanitizeBaseUrl = (value?: string | null, fallback?: string): string => {
  const candidate = value?.trim() || fallback || "";
  return candidate.replace(/\/+$/, "");
};

const hasZohoDashboardSyncConfig = () =>
  Boolean(
    ZOHO_ORG_ID &&
      ZOHO_CLIENT_ID &&
      ZOHO_CLIENT_SECRET &&
      ZOHO_REFRESH_TOKEN &&
      ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME,
  );

class ZohoBooksService {
  isDashboardSyncConfigured(): boolean {
    return hasZohoDashboardSyncConfig();
  }

  private async getAccessToken(): Promise<{ token: string; apiDomain: string }> {
    const now = Date.now();
    if (
      cachedAccessToken &&
      cachedApiDomain &&
      accessTokenExpiresAt > now + 60_000
    ) {
      return {
        token: cachedAccessToken,
        apiDomain: cachedApiDomain,
      };
    }

    const oauthBaseUri = sanitizeBaseUrl(ZOHO_OAUTH_URI, ZOHO_OAUTH_FALLBACK_URI);
    const tokenUrl = new URL(`${oauthBaseUri}/oauth/v2/token`);
    tokenUrl.searchParams.set("refresh_token", ZOHO_REFRESH_TOKEN || "");
    tokenUrl.searchParams.set("client_id", ZOHO_CLIENT_ID || "");
    tokenUrl.searchParams.set("client_secret", ZOHO_CLIENT_SECRET || "");
    tokenUrl.searchParams.set("grant_type", "refresh_token");

    if (ZOHO_REDIRECT_URI) {
      tokenUrl.searchParams.set("redirect_uri", ZOHO_REDIRECT_URI);
    }

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/data",
      },
    });

    const data = (await response.json()) as ZohoAccessTokenResponse;
    if (!response.ok || !data.access_token) {
      const errorMessage = data.error || `HTTP ${response.status}`;
      throw new Error(`Failed to refresh Zoho Books access token: ${errorMessage}`);
    }

    const apiDomain = sanitizeBaseUrl(
      data.api_domain,
      sanitizeBaseUrl(ZOHO_BASE_URI, ZOHO_API_FALLBACK_BASE_URI),
    );

    cachedAccessToken = data.access_token;
    cachedApiDomain = apiDomain;
    accessTokenExpiresAt =
      now + Math.max((data.expires_in || 3600) - 60, 60) * 1000;

    return {
      token: data.access_token,
      apiDomain,
    };
  }

  private async zohoRequest<T>(
    method: "GET" | "POST" | "PUT",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const { token, apiDomain } = await this.getAccessToken();
    const requestUrl = new URL(
      `/books/v3/${path.replace(/^\/+/, "")}`,
      `${sanitizeBaseUrl(apiDomain)}/`,
    );

    const response = await fetch(requestUrl, {
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as T & {
      code?: number;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(
        `Zoho Books request failed (${method} ${requestUrl.pathname}): ${
          data?.message || response.statusText
        }`,
      );
    }

    return data;
  }

  private buildSnapshotPayload(payload: ZohoBusinessSnapshotPayload) {
    return {
      record_name: payload.summaryDate,
      [ZOHO_BOOKS_TOTAL_USERS_FIELD_API_NAME]: payload.metrics.totalUsers,
      [ZOHO_BOOKS_ACTIVE_AGGREGATORS_FIELD_API_NAME]:
        payload.metrics.activeAggregators,
      [ZOHO_BOOKS_ACTIVE_SUBSCRIPTIONS_FIELD_API_NAME]:
        payload.metrics.activeSubscriptions,
      [ZOHO_BOOKS_VERIFIED_AGGREGATOR_LINKS_FIELD_API_NAME]:
        payload.metrics.verifiedAggregatorLinks,
      [ZOHO_BOOKS_GENERATED_AT_FIELD_API_NAME]: payload.generatedAt,
    };
  }

  private async findExistingSnapshotRecord(summaryDate: string) {
    const query = new URLSearchParams({
      organization_id: ZOHO_ORG_ID || "",
      page: "1",
      per_page: "200",
    });

    const response = await this.zohoRequest<ZohoModuleRecordListResponse>(
      "GET",
      `${ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME}?${query.toString()}`,
    );

    return (response.module_record || []).find(
      (record) => record.record_name === summaryDate,
    );
  }

  async upsertBusinessSnapshot(
    payload: ZohoBusinessSnapshotPayload,
  ): Promise<ZohoSyncResult> {
    if (!this.isDashboardSyncConfigured()) {
      return {
        skipped: true,
        message:
          "Zoho Books dashboard sync skipped because required configuration is missing.",
      };
    }

    const query = new URLSearchParams({
      organization_id: ZOHO_ORG_ID || "",
    });
    const requestBody = this.buildSnapshotPayload(payload);
    const existingRecord = await this.findExistingSnapshotRecord(
      payload.summaryDate,
    );

    if (existingRecord?.module_record_id) {
      const response = await this.zohoRequest<ZohoModuleMutationResponse>(
        "PUT",
        `${ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME}/${existingRecord.module_record_id}?${query.toString()}`,
        requestBody,
      );

      logger.info(
        `Updated Zoho Books business snapshot for ${payload.summaryDate}`,
      );

      return {
        skipped: false,
        action: "updated",
        moduleRecordId: existingRecord.module_record_id,
        message: response.message || "Zoho Books business snapshot updated.",
      };
    }

    const response = await this.zohoRequest<ZohoModuleMutationResponse>(
      "POST",
      `${ZOHO_BOOKS_DASHBOARD_MODULE_API_NAME}?${query.toString()}`,
      requestBody,
    );

    const createdRecord = Array.isArray(response.module_record)
      ? response.module_record[0]
      : response.module_record;

    logger.info(`Created Zoho Books business snapshot for ${payload.summaryDate}`);

    return {
      skipped: false,
      action: "created",
      moduleRecordId: createdRecord?.module_record_id,
      message: response.message || "Zoho Books business snapshot created.",
    };
  }
}

export const zohoBooksService = new ZohoBooksService();
