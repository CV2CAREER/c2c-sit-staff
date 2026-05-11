// models/v1/interview-prep-evidence.model.ts
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
import { User } from "./user.model";

/**
 * InterviewPrepEvidence Model
 * 
 * Stores evidence files and URLs for interview preparation
 */
@Table({
  tableName: "interview_prep_evidence",
  timestamps: true,
})
export class InterviewPrepEvidence extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, "userId")
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  filename!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  originalName!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  url!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  fileType!: string;

  @Column(DataType.INTEGER)
  size!: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  storagePath!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  storageType!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isUrl!: boolean;

  @Column(DataType.STRING)
  prepId?: string;

  @Column(DataType.STRING)
  sessionId?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}