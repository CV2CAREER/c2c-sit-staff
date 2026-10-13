import { AllowNull, Column, DataType, Default, Index, Model, PrimaryKey, Table } from "sequelize-typescript";

export enum SchemaChangeStatus {
  // Non-protected database: reviewed, can be applied by an admin.
  READY = "ready",
  // Protected database (PROD): waiting for a second admin.
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  RUNNING = "running",
  APPLIED = "applied",
  FAILED = "failed",
}

export const SCHEMA_CHANGE_STATUSES = Object.values(SchemaChangeStatus);

/**
 * One reviewed set of guided schema operations against one database
 * (Admin > Database Modifications). Stores the exact operations, the review/plan
 * the admins saw (planHash guards against applying a stale review), and
 * the execution log, backups and verification afterwards.
 *
 * Lives in this server's own database regardless of which database the
 * change targets.
 */
@Table({
  tableName: "schema_change_requests",
  timestamps: true,
  indexes: [{ name: "idx_schema_change_requests_status", fields: ["status"] }],
})
export class SchemaChangeRequest extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  title!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  reason?: string | null;

  /** "change" for guided operations, "revert" for an undo of an applied change. */
  @AllowNull(false)
  @Default("change")
  @Column(DataType.STRING(20))
  kind!: string;

  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  revertOfId?: string | null;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  targetKey!: string;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  targetDatabase!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isProtected!: boolean;

  @AllowNull(false)
  @Column(DataType.JSONB)
  operations!: unknown[];

  @AllowNull(false)
  @Column(DataType.JSONB)
  plan!: Record<string, unknown>;

  @AllowNull(false)
  @Column(DataType.STRING(64))
  planHash!: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  riskLevel!: string;

  @AllowNull(false)
  @Column(DataType.STRING(30))
  status!: SchemaChangeStatus;

  @AllowNull(false)
  @Column(DataType.STRING)
  createdById!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  createdByEmail?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  approvedById?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  approvedByEmail?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  approvedAt?: Date | null;

  /** "second_admin" (another admin approved) or "master_key" (approved with the master password). */
  @AllowNull(true)
  @Column(DataType.STRING(20))
  approvalMethod?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  rejectedById?: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  rejectedReason?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  appliedById?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  appliedByEmail?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  appliedAt?: Date | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  error?: string | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  executionLog?: unknown[] | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  backups?: unknown[] | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  verification?: unknown[] | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  revertedById?: string | null;
}
