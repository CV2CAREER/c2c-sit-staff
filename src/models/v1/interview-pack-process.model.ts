import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  Index,
} from "sequelize-typescript";
import { User } from "./user.model";

/**
 * `in_progress` — created or a stage just completed successfully, more
 *   stages remain.
 * `failed` — the current stage's AI call errored. Still resumable: the
 *   failed stage is retried (currentStage is not advanced on failure), it's
 *   just surfaced as "failed" so a new process isn't silently blocked from
 *   ever starting if this one is abandoned.
 * `completed` — all 4 stages finished. Only status that allows a *new*
 *   process to start for this user.
 */
export enum InterviewPackProcessStatus {
  IN_PROGRESS = "in_progress",
  FAILED = "failed",
  COMPLETED = "completed",
}

export const INTERVIEW_PACK_PROCESS_STATUSES = Object.values(InterviewPackProcessStatus);

/**
 * One row per "Generate Interview Pack" run. Persists each of the 4 stage
 * results as they complete so a failure partway through can resume from the
 * failed stage (reusing the already-generated earlier stages) instead of
 * restarting the whole pack and re-spending AI calls on stages that already
 * succeeded. `startOrResume` in interview-pack.service.ts enforces at most
 * one non-completed process per *resume* at a time (not per user — a client
 * can have multiple resumes, and a stuck process on one must not block
 * generating a pack for another).
 */
@Table({
  tableName: "interview_pack_processes",
  timestamps: true,
  indexes: [
    { name: "idx_interview_pack_processes_user_id", fields: ["userId"] },
    { name: "idx_interview_pack_processes_status", fields: ["status"] },
  ],
})
export class InterviewPackProcess extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  resumeUploadId!: string;

  @AllowNull(true)
  @Column(DataType.STRING(1024))
  jobLink?: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  jobContent!: string;

  /** Which stage (1-4) runs next on the next runNextStage() call. */
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  currentStage!: number;

  @AllowNull(false)
  @Default(InterviewPackProcessStatus.IN_PROGRESS)
  @Column(DataType.ENUM(...INTERVIEW_PACK_PROCESS_STATUSES))
  status!: InterviewPackProcessStatus;

  @AllowNull(true)
  @Column(DataType.JSONB)
  stage1Result?: Record<string, unknown>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  stage2Result?: Record<string, unknown>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  stage3Result?: Record<string, unknown>;

  @AllowNull(true)
  @Column(DataType.JSONB)
  stage4Result?: Record<string, unknown>;

  @AllowNull(true)
  @Column(DataType.STRING(1024))
  errorMessage?: string;

  /** Staff user id that triggered this run. */
  @AllowNull(true)
  @Column(DataType.STRING)
  createdBy?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default InterviewPackProcess;
