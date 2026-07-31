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
  @Column(DataType.STRING)
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

  @AllowNull(true)
  @Column(DataType.STRING)
  deletedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  deletedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}