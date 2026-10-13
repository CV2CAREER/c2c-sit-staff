// Mirrors c2c-staff-backend/src/services/admin/schema-diff.*.ts

export type DiffSeverity = "critical" | "warning" | "info";
export type DiffCategory =
  | "table"
  | "view"
  | "column"
  | "constraint"
  | "index"
  | "trigger"
  | "enum"
  | "extension";
export type DiffChange =
  | "missing_in_target"
  | "extra_in_target"
  | "modified"
  | "renamed"
  | "duplicate";

export interface SchemaTarget {
  key: string;
  label: string;
  database: string;
  hostHint: string;
  source: "cluster" | "configured";
  isCurrent: boolean;
  available: boolean;
  unavailableReason?: string;
}

export interface TargetsResponse {
  targets: SchemaTarget[];
  warnings: string[];
}

export interface PingResult {
  key: string;
  label: string;
  database: string;
  serverVersion: string;
  publicTables: number;
  latencyMs: number;
}

export interface DiffItem {
  id: string;
  category: DiffCategory;
  change: DiffChange;
  severity: DiffSeverity;
  object: string;
  name: string;
  message: string;
  source?: string | null;
  target?: string | null;
  sql?: string;
  destructive?: boolean;
  legacy?: string;
}

export type TableUsage = "used" | "unused";

export interface LegacyObject {
  object: string;
  table: string;
  kind: "table" | "view" | "enum";
  reason: string;
  inSource: boolean;
  inTarget: boolean;
  rowEstimate: number;
  differences: number;
}

export interface SideInfo {
  key: string;
  label: string;
  database: string;
  serverVersion: string;
  capturedAt: string;
  durationMs: number;
  fromCache: boolean;
  relationCount: number;
  enumCount: number;
}

export interface CompareResult {
  summary: {
    identical: boolean;
    total: number;
    bySeverity: Record<DiffSeverity, number>;
    byCategory: Record<DiffCategory, number>;
    byChange: Record<DiffChange, number>;
    objectsCompared: { source: number; target: number };
    objectsAffected: number;
  };
  items: DiffItem[];
  sql: string;
  source: SideInfo;
  target: SideInfo;
  schemas: string[];
  availableSchemas: string[];
  comparedAt: string;
  durationMs: number;
  legacy: {
    included: boolean;
    hiddenDifferences: number;
    objects: LegacyObject[];
  };
  usage: {
    scanGeneratedAt: string;
    overrides: Record<string, TableUsage>;
  };
}

export interface CompareRequest {
  sourceKey: string;
  targetKey: string;
  schemas: string[];
  refresh?: boolean;
  includeLegacy?: boolean;
}

export interface AiReview {
  headline: string;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  keyFindings: { title: string; detail: string; severity: DiffSeverity }[];
  likelyCauses: string[];
  deploymentPlan: string[];
  cautions: string[];
}

export type AiResponse =
  | { mode: "review"; review: AiReview }
  | { mode: "answer"; question: string; answer: string };
