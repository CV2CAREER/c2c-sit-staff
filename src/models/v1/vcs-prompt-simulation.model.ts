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
 * One row per admin-triggered test run of a VCS prompt version (the
 * "Simulate" tab) — distinct from vcs-prompt-usage-log.model.ts, which
 * records real production AI calls. Simulation runs never affect
 * production and always carry the actor who triggered them and the full
 * rendered output, so History can show exactly what was tested.
 */
@Table({
  tableName: "vcs_prompt_simulation_runs",
  timestamps: true,
  updatedAt: false,
})
export class VCSPromptSimulationRun extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  vcsId!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  versionId!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  version?: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  variables?: Record<string, string>;

  @AllowNull(false)
  @Column(DataType.TEXT)
  renderedPrompt!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  output?: string;

  @AllowNull(false)
  @Default("success")
  @Column(DataType.ENUM("success", "failed"))
  status!: "success" | "failed";

  @AllowNull(true)
  @Column(DataType.TEXT)
  errorMessage?: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  durationMs!: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  triggeredBy?: string;

  @CreatedAt
  createdAt!: Date;
}

export default VCSPromptSimulationRun;
