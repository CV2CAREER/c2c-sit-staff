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
} from "sequelize-typescript";

@Table({
  tableName: "vcs_prompts",
  timestamps: true,
})
export class VCSPrompt extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  prompt!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  version!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  active!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

@Table({
  tableName: "vcs_configurations",
  timestamps: true,
})
export class VCS extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  active!: boolean;

  @ForeignKey(() => VCSPrompt)
  @Column(DataType.UUID)
  activePromptId!: string;

  @BelongsTo(() => VCSPrompt, "activePromptId")
  activePrompt?: VCSPrompt;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}