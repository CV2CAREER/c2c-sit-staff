import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./user.model";
import { Upload } from "./upload.model";

/**
 * Status Enum
 */
export enum CvStatus {
  PENDING = "pending",
  APPROVED = "approved",
  DECLINED = "declined",
}

@Table({
  tableName: "cv_revamps",
  timestamps: true,
})
export class CvRevamp extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  // Reference to uploaded file
  @ForeignKey(() => Upload)
  @AllowNull(true)
  @Column(DataType.UUID)
  uploadId?: string;

  @BelongsTo(() => Upload, "uploadId")
  upload?: Upload;

  // User reference
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, "userId")
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  fullName!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  url!: string;

  @AllowNull(false)
  @Default(CvStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(CvStatus)))
  status!: CvStatus;

  @AllowNull(true)
  @Column(DataType.STRING)
  fileName?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}