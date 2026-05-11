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
import {
  UploadType,
  UploadStatus,
  UploadSource,
  CvType,
} from "../../utils/enum";
import {
  CvDataPoints,
  DocumentFile,
} from "../../types/userdocument.types";
import { User } from "./user.model";

@Table({
  tableName: "uploads",
  timestamps: true,
  paranoid: true, // Soft deletes (isDeleted functionality)
})
export class Upload extends Model {
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
  @Column(DataType.ENUM(...Object.values(UploadType)))
  type!: UploadType;

  @AllowNull(false)
  @Default(UploadStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(UploadStatus)))
  status!: UploadStatus;

  @AllowNull(false)
  @Column(DataType.JSONB)
  document!: DocumentFile;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @AllowNull(false)
  @Default(UploadSource.CLIENT)
  @Column(DataType.ENUM(...Object.values(UploadSource)))
  source!: UploadSource;

  // CV Data Points stored as JSONB
  @AllowNull(true)
  @Column(DataType.JSONB)
  cvDataPoints?: CvDataPoints;

  // Array of job titles
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  cvJobTitles?: string[];

  // Array of keywords
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  keywords?: string[];

  // Field to track if this is the default CV/Resume
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDefault!: boolean;

  // Timestamps
  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Approval fields
  @AllowNull(true)
  @Column(DataType.DATE)
  approvedAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  approvedBy?: string;

  // Rejection fields
  @AllowNull(true)
  @Column(DataType.DATE)
  rejectedAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  rejectedBy?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  rejectionReason?: string;

  // Soft delete timestamp
  @Column(DataType.DATE)
  deletedAt?: Date;
}
