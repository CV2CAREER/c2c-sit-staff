import { BOT_NAMES } from "@/utils/constants";

export type BotName = (typeof BOT_NAMES)[number];
export type BotStatus = "On" | "Off" | "Unknown";
export type AnswerMode = "AI" | "DB";

export interface AnswerModeItem {
  id: number;
  description: string;
  status: "True" | "False";
}

export interface ApiTableColumn {
  name: string;
  isDynamic?: boolean;
}

export interface ApiTable {
  _id: string;
  name: string;
  isCodebase?: boolean;
  columns: ApiTableColumn[];
}

export interface Throttle {
  id: number;
  aggregator: string;
  value: number;
}

export interface CreateTablePayload {
  name: string;
}

export interface CreateColumnPayload {
  name: string;
  column: string;
}

export interface DeleteColumnPayload {
  tableName: string;
  columnName: string;
}

export interface UpdateAnswerModePayload {
  id: number;
  description: string;
  status: "True" | "False";
}

export interface Aggregator {
  _id: string;
  name: string;
  isEnabled: boolean;
  picture?: {
    fileUrl: string;
    [key: string]: any;
  };
}

export interface CreateAggregatorPayload {
  name: string;
  picture: any;
}

export interface ToggleAggregatorPayload {
  isEnabled: boolean;
}

export interface SlackQueueResponse {
  data: {
    result: string[];
  };
}

export interface ResourceMode {
  success: boolean;
  data: {
    resourceName: string;
    value: string;
  };
}

export interface UpdateResourcePayload {
  resourceName: string;
  value: string;
}
