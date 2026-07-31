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
import { MissingInfoType } from "../../types/missingInfoConfig";
import { MissingInfoTemplate } from "./missing-info-template.model";

export const MISSING_INFO_REQUEST_STATUSES = [
  "pending",
  "viewed",
  "in_progress",
  "submitted",
  "expired",
] as const;
export type MissingInfoRequestStatus = (typeof MISSING_INFO_REQUEST_STATUSES)[number];

export const MISSING_INFO_REQUEST_CHANNELS = ["email", "whatsapp"] as const;
export type MissingInfoRequestChannel = (typeof MISSING_INFO_REQUEST_CHANNELS)[number];

@Table({
  tableName: "missing_info_requests",
  timestamps: true,
})
export class MissingInfoRequest extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  targetUserId!: string;

  @BelongsTo(() => User, {
    foreignKey: "targetUserId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  targetUser!: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  requestedById!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  requestedByName!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  missingInfoType!: MissingInfoType;

  @ForeignKey(() => MissingInfoTemplate)
  @AllowNull(true)
  @Column(DataType.STRING)
  templateId!: string;

  @BelongsTo(() => MissingInfoTemplate, {
    foreignKey: "templateId",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  template!: MissingInfoTemplate;

  @AllowNull(true)
  @Column(DataType.STRING)
  token!: string;

  @AllowNull(true)
  @Default("pending")
  @Column(DataType.ENUM(...MISSING_INFO_REQUEST_STATUSES))
  status!: MissingInfoRequestStatus;

  @AllowNull(true)
  @Default("email")
  @Column(DataType.ENUM(...MISSING_INFO_REQUEST_CHANNELS))
  channel!: MissingInfoRequestChannel;

  @AllowNull(true)
  @Column(DataType.TEXT)
  personalMessage!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  missingInfoUrl!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  jobURL!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  jobApplicationId!: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  requestedAt!: Date;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  reminderCount!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastReminderAt!: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  fulfilledAt!: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
