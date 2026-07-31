import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
} from "sequelize-typescript";

/**
 * One row per AI call made with a VCS-backed prompt (see
 * models/v1/keyword-population.model.ts) — an append-only performance log
 * so the admin panel can show how the AI is actually behaving per prompt
 * key (latency, prompt/response size, success rate) rather than just the
 * prompt text itself. `key`/`version` are snapshotted at call time so the
 * log stays meaningful even if the prompt is later edited or deleted.
 */
@Table({
  tableName: "vcs_prompt_usage_logs",
  timestamps: true,
  updatedAt: false,
})
export class VCSPromptUsageLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  key!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  vcsId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  promptId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  version?: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  promptLength!: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  responseLength?: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  durationMs!: number;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  success!: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  errorMessage?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  model?: string;

  @CreatedAt
  createdAt!: Date;
}

export default VCSPromptUsageLog;
