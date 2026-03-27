import { BOT_NAMES } from "@/utils/constants";

export type BotName = (typeof BOT_NAMES)[number];
export type BotStatus = "On" | "Off" | "Unknown";
export type AnswerMode = "AI" | "DB";

export interface AnswerModeItem {
  id: number;
  description: string;
  status: "True" | "False";
}

export interface ApiTable {
  _id: string;
  name: string;
  columns: string[];
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
