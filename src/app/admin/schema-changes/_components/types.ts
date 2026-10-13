// Mirrors c2c-staff-backend/src/services/admin/schema-change/*

export type Risk = "safe" | "caution" | "destructive";
export type ImpactLevel = "none" | "low" | "medium" | "high" | "blocker";
export type ChangeStatus =
  | "ready"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "running"
  | "applied"
  | "failed";

export type DefaultInput =
  | { kind: "none" }
  | { kind: "literal"; value: string }
  | { kind: "expression"; value: string };

export interface ColumnInput {
  name: string;
  type: string;
  nullable: boolean;
  default?: DefaultInput;
}

export type OperationInput = (
  | { kind: "add_column"; table: string; column: string; type: string; nullable: boolean; default?: DefaultInput }
  | { kind: "drop_column"; table: string; column: string }
  | { kind: "alter_column_type"; table: string; column: string; type: string }
  | { kind: "set_nullable"; table: string; column: string; nullable: boolean }
  | { kind: "set_default"; table: string; column: string; default: DefaultInput }
  | { kind: "create_index"; table: string; name: string; columns: string[]; unique: boolean }
  | { kind: "drop_index"; table: string; name: string }
  | { kind: "add_unique"; table: string; name: string; columns: string[] }
  | { kind: "add_foreign_key"; table: string; name: string; columns: string[]; refSchema?: string; refTable: string; refColumns: string[]; onDelete: string }
  | { kind: "drop_constraint"; table: string; name: string }
  | { kind: "create_table"; table: string; columns: ColumnInput[]; primaryKey: string[] }
  | { kind: "drop_table"; table: string }
  | { kind: "add_enum_value"; enum: string; value: string }
  | {
      kind: "update_value";
      table: string;
      keyColumn: string;
      keyValue: string;
      column: string;
      newValue: string | null;
      expectedOld?: string | null;
    }
  | {
      kind: "delete_rows";
      table: string;
      mode: "selection" | "filter";
      keys?: Record<string, string>[];
      conditions?: RowCondition[];
      allRows?: boolean;
      // display only
      matched?: number;
    }
  | {
      kind: "apply_diff";
      sourceKey: string;
      schemas: string[];
      item: { object: string; category: string; change: string; name: string };
      // display only
      label?: string;
    }
) & { schema?: string };

export type OperationKind = OperationInput["kind"];

export const ROW_OPERATORS = {
  eq: { label: "equals", arity: 1 },
  ne: { label: "is not", arity: 1 },
  contains: { label: "contains", arity: 1 },
  starts_with: { label: "starts with", arity: 1 },
  ends_with: { label: "ends with", arity: 1 },
  lt: { label: "less than", arity: 1 },
  lte: { label: "at most", arity: 1 },
  gt: { label: "greater than", arity: 1 },
  gte: { label: "at least", arity: 1 },
  in: { label: "is one of (comma separated)", arity: 1 },
  is_null: { label: "is empty", arity: 0 },
  not_null: { label: "is not empty", arity: 0 },
} as const;

export type RowOperator = keyof typeof ROW_OPERATORS;

export interface RowCondition {
  column: string;
  op: RowOperator;
  value?: string | string[];
}

export interface RowsResponse {
  schema: string;
  table: string;
  primaryKey: string[];
  columns: { name: string; type: string; sensitive: boolean; isKey: boolean }[];
  rows: { key: Record<string, string> | null; values: (string | null)[] }[];
  total: number;
  totalIsEstimate: boolean;
  page: number;
  pageSize: number;
}

export interface Structure {
  targetKey: string;
  database: string;
  isProtected: boolean;
  tables: {
    schema: string;
    name: string;
    rowEstimate: number;
    columns: { name: string; type: string; nullable: boolean; default: string | null }[];
    indexes: { name: string; unique: boolean; constraintBacked: boolean }[];
    constraints: { name: string; type: string; definition: string }[];
  }[];
  enums: { schema: string; name: string; labels: string[] }[];
  choices: { types: string[]; defaultExpressions: string[]; onDelete: string[] };
  capturedAt: string;
}

export interface CheckResult {
  status: "pass" | "warn" | "fail";
  label: string;
  message: string;
}

export interface ImpactReport {
  level: ImpactLevel;
  headline: string;
  notes: string[];
  models: { app: "staff" | "customer"; className: string; file: string; attribute?: string }[];
  endpoints: { app: "staff" | "customer"; method: string; path: string; mentionsColumn: boolean }[];
  screens: { app: "staff" | "customer"; route: string; direct: boolean }[];
  moreScreens: number;
}

export interface PlannedOperation {
  index: number;
  title: string;
  origin?: string;
  risk: Risk;
  table: string | null;
  statements: string[];
  backupStatements: string[];
  backups: { table: string; description: string }[];
  undoStatements: string[];
  undoNote?: string;
  checks: CheckResult[];
  impact: ImpactReport;
  heavy: boolean;
  rowEstimate: number;
  notes: string[];
  dryRun: { status: "passed" | "failed" | "skipped" | "not_run"; message?: string; durationMs?: number };
  expectedRows?: number;
  preview?: { columns: string[]; rows: (string | null)[][] };
}

export interface PlanResult {
  targetKey: string;
  targetDatabase: string;
  targetLabel: string;
  isProtected: boolean;
  serverVersion: string;
  operations: PlannedOperation[];
  summary: {
    risk: Risk;
    impactLevel: ImpactLevel;
    blockers: number;
    warnings: number;
    destructive: number;
    backups: number;
    requiresApproval: boolean;
    requiresTypedConfirmation: boolean;
    canApply: boolean;
    reasonsBlocked: string[];
  };
  dryRun: { status: "passed" | "failed" | "partial" | "not_run"; message: string; durationMs: number };
  sql: string;
  undoSql: string;
  plannedAt: string;
  codeIndex: { generatedAt: string; missingRepos: string[] };
}

export interface ChangeRequest {
  id: string;
  title: string;
  reason: string | null;
  kind: "change" | "revert";
  revertOfId: string | null;
  revertedById: string | null;
  targetKey: string;
  targetDatabase: string;
  isProtected: boolean;
  riskLevel: Risk;
  status: ChangeStatus;
  createdById: string;
  createdByEmail: string | null;
  approvedById: string | null;
  approvedByEmail: string | null;
  approvedAt: string | null;
  approvalMethod?: "second_admin" | "master_key" | null;
  rejectedById: string | null;
  rejectedReason: string | null;
  appliedById: string | null;
  appliedByEmail: string | null;
  appliedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  // display names resolved by the server
  createdByName?: string | null;
  approvedByName?: string | null;
  appliedByName?: string | null;
  rejectedByName?: string | null;
  // detail only
  plan?: PlanResult;
  executionLog?: { op: number; sql: string; durationMs: number; ok: boolean; error?: string }[] | null;
  backups?: { table: string; description: string }[] | null;
  verification?: { op?: number; ok: boolean; message: string }[] | null;
}

// Queued from Database Evaluation ("Fix in target"), picked up by the builder.
export interface DiffDraft {
  sourceKey: string;
  targetKey: string;
  items: { object: string; category: string; change: string; name: string; label: string }[];
}

export const DIFF_DRAFT_KEY = "c2c-staff-schema-change-draft";
