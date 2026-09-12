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
  Index,
} from "sequelize-typescript";
import { EmailTemplate } from "./email-template.model";
import { User } from "./user.model";

export enum EmailTestSendStatus {
  SENT = "sent",
  FAILED = "failed",
}

export const EMAIL_TEST_SEND_STATUSES = Object.values(EmailTestSendStatus);

/**
 * One row per admin-triggered test send. Deliberately separate from
 * EmailLog so test sends never mix into real send analytics/logging —
 * this repo has no migrations, so altering EmailLog's existing schema
 * isn't a safe option; a net-new table is.
 */
@Table({
  tableName: "email_test_send_logs",
  timestamps: true,
  indexes: [{ name: "idx_email_test_send_logs_template_id", fields: ["templateId"] }],
})
export class EmailTestSendLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => EmailTemplate)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  templateId!: string;

  @BelongsTo(() => EmailTemplate, {
    foreignKey: "templateId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  template?: EmailTemplate;

  /** The trigger this template happened to be bound to at test-send time, if any. */
  @AllowNull(true)
  @Column(DataType.STRING(128))
  triggerKeyUsed?: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  sentByAdminId!: string;

  @BelongsTo(() => User, { foreignKey: "sentByAdminId" })
  sentByAdmin?: User;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  recipientEmail!: string;

  @AllowNull(false)
  @Default(EmailTestSendStatus.SENT)
  @Column(DataType.ENUM(...EMAIL_TEST_SEND_STATUSES))
  status!: EmailTestSendStatus;

  @AllowNull(true)
  @Column(DataType.STRING(512))
  errorMessage?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default EmailTestSendLog;
