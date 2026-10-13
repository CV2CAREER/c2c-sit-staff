// Mirrors c2c-staff-backend/src/services/admin/schema-change/sheet-import/*
import type { OperationInput } from "./types";

export interface ParsedSheet {
  name: string;
  headerRow: number;
  headers: string[];
  rows: { rowNumber: number; cells: string[] }[];
  truncated: boolean;
  looksLikeRequests: boolean;
}

export interface LoadedWorkbook {
  source: string;
  sheets: ParsedSheet[];
  serviceAccountEmail: string | null;
}

export type Role =
  | "action"
  | "table"
  | "column"
  | "row_id"
  | "verify_field"
  | "verify_value"
  | "previous_value"
  | "proposed_value"
  | "status"
  | "requester"
  | "ignore";

export const ROLE_LABELS: Record<Role, string> = {
  action: "What to do (type)",
  table: "Table / area",
  column: "Field to change",
  row_id: "Row ID",
  verify_field: "Check field (e.g. Full Name)",
  verify_value: "Check value",
  previous_value: "Previous value",
  proposed_value: "New value",
  status: "Status",
  requester: "Requested by",
  ignore: "Not used",
};

export type ActionKind = "delete_row" | "update_value" | "skip";

export interface ImportAnswers {
  roleColumns?: Partial<Record<Role, number>>;
  actions?: Record<string, ActionKind>;
  tables?: Record<string, string>;
  idColumns?: Record<string, string>;
  verifyColumns?: Record<string, string>;
  updateColumns?: Record<string, string>;
  statuses?: Record<string, boolean>;
  excludeRows?: number[];
}

export interface ImportQuestion {
  id: string;
  kind: "role" | "action" | "table" | "idColumn" | "verify" | "updateColumn";
  key: string;
  prompt: string;
  detail?: string;
  options: { value: string; label: string; description?: string }[];
  suggested?: string;
}

export type RowState = "ready" | "not_found" | "mismatch" | "skipped" | "unresolved" | "invalid" | "duplicate";

export interface Interpretation {
  understood: boolean;
  roles: { index: number; header: string; role: Role; source: "answer" | "memory" | "header" | "none" }[];
  questions: ImportQuestion[];
  statuses: { value: string; count: number; include: boolean }[];
  rows: {
    rowNumber: number;
    action: ActionKind | null;
    table: string | null;
    id: string | null;
    summary: string;
    state: RowState;
    message: string;
    include: boolean;
  }[];
  summary: Record<RowState, number> & { total: number; included: number };
  plan: { operations: OperationInput[]; title: string; reason: string } | null;
  notes: string[];
}

// Handed from the import wizard to the change builder.
export interface ImportDraft {
  targetKey: string;
  operations: OperationInput[];
  title: string;
  reason: string;
  source: string;
}

export const IMPORT_DRAFT_KEY = "c2c-staff-schema-change-import-draft";
