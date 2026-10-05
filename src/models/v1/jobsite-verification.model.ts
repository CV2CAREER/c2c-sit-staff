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

export const JOBSITE_VERIFICATION_STATUSES = [
  "not_started",
  "pending",
  "verified",
  "rejected",
  "exempt",
] as const;

export type JobsiteVerificationStatus =
  (typeof JOBSITE_VERIFICATION_STATUSES)[number];

@Table({
  tableName: "jobsite_verifications",
  timestamps: true,
  indexes: [
    {
      name: "uniq_jobsite_verification_per_client_jobsite_country",
      unique: true,
      fields: ["client_id", "jobsite_id", "country"],
    },
    {
      name: "idx_jobsite_verifications_client_id",
      fields: ["client_id"],
    },
    {
      name: "idx_jobsite_verifications_jobsite_id",
      fields: ["jobsite_id"],
    },
    {
      name: "idx_jobsite_verifications_status",
      fields: ["status"],
    },
  ],
})

export class JobsiteVerification extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: "client_id",
  })
  clientId!: string;

  @BelongsTo(() => User, {
    foreignKey: "clientId",
    targetKey: "id",
    as: "client",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  client?: User;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: "jobsite_id",
  })
  jobsiteId!: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: "country",
  })
  country!: string;

  @AllowNull(false)
  @Default("not_started")
  @Column({
    type: DataType.ENUM(...JOBSITE_VERIFICATION_STATUSES),
    field: "status",
  })
  status!: JobsiteVerificationStatus;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: "proof_file_ref",
  })
  proofFileRef?: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.DATE,
    field: "submitted_at",
  })
  submittedAt?: Date | null;

  @AllowNull(true)
  @Column({
    type: DataType.DATE,
    field: "reviewed_at",
  })
  reviewedAt?: Date | null;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
    field: "reviewed_by",
  })
  reviewedBy?: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: "reject_reason",
  })
  rejectReason?: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: "exempt_reason",
  })
  exemptReason?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
