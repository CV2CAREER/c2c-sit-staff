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
  HasMany,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  tableName: "vcs_prompts",
  timestamps: true,
})
export class VCSPrompt extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => VCS)
  @AllowNull(true)
  @Column(DataType.STRING)
  vcsId?: string;

  // Typed `any`, not `VCS`, on purpose: `VCS` is declared further down in
  // this file, and a direct class-typed property here makes TypeScript's
  // emitDecoratorMetadata emit `__metadata("design:type", VCS)` at
  // VCSPrompt's class-evaluation time — before the VCS class binding
  // exists — which throws "Cannot access 'VCS' before initialization" in
  // the compiled build. The lazy `() => VCS` callback below is unaffected
  // and still wires the association correctly at runtime.
  @BelongsTo(() => VCS, "vcsId")
  vcs?: any;

  @AllowNull(false)
  @Column(DataType.TEXT)
  prompt!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  version!: string;

  // Legacy bookkeeping flag — no production read path filters on this
  // anymore (everything reads via VCS.activePromptId). `status` below is
  // the source of truth for the draft/live/retired lifecycle.
  @Default(false)
  @Column(DataType.BOOLEAN)
  active!: boolean;

  @Default("live")
  @Column(DataType.ENUM("draft", "live", "retired"))
  status!: "draft" | "live" | "retired";

  @AllowNull(true)
  @Column(DataType.STRING)
  createdBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  deployedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  deployedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

@Table({
  tableName: "vcs_configurations",
  timestamps: true,
  paranoid: true,
})
export class VCS extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  active!: boolean;

  @AllowNull(false)
  @Column(DataType.STRING)
  key!: string;

  @ForeignKey(() => VCSPrompt)
  @Column(DataType.STRING)
  activePromptId!: string;

  @BelongsTo(() => VCSPrompt, "activePromptId")
  activePrompt?: VCSPrompt;

  @HasMany(() => VCSPrompt, "vcsId")
  versions?: VCSPrompt[];

  @AllowNull(true)
  @Column(DataType.STRING)
  deletedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  deletedAt?: Date;

  // Whoever most recently touched this key — metadata edit, draft save, or
  // a live promotion — set on every mutating service call, so the prompts
  // table can show a single "last edited by" column without joining
  // versions.
  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  category?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  model?: string;

  @AllowNull(true)
  @Column(DataType.FLOAT)
  temperature?: number;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  maxTokens?: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}