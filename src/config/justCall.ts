import axios, { AxiosInstance } from "axios";
import { getServiceLogger } from "../utils/createLogger";
import { JUSTCALL_API_KEY, JUSTCALL_API_SECRET } from "./env";

const logger = getServiceLogger("justcall");

const JUSTCALL_BASE_URL = "https://api.justcall.io/v2.1";

let justCallClient: AxiosInstance | null = null;

export const getJustCallClient = (): AxiosInstance => {
  if (justCallClient) return justCallClient;

  if (!JUSTCALL_API_KEY || !JUSTCALL_API_SECRET) {
    throw new Error(
      "JustCall API credentials are missing from environment variables",
    );
  }

  const authToken = Buffer.from(
    `${JUSTCALL_API_KEY}:${JUSTCALL_API_SECRET}`,
  ).toString("base64");

  justCallClient = axios.create({
    baseURL: JUSTCALL_BASE_URL,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authToken}`,
    },
  });

  // Log every request
  justCallClient.interceptors.request.use((config) => {
    logger.info(`JustCall → ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });

  // Log every response / error
  justCallClient.interceptors.response.use(
    (response) => {
      logger.info(`JustCall ← ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      logger.error(
        `JustCall error on ${error.config?.url}: ${error.response?.data?.message || error.message}`,
      );
      return Promise.reject(error);
    },
  );

  logger.info("✅ JustCall client initialized");
  return justCallClient;
};
