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
import { User } from "./user.model";

export enum EmailLogStatus {
  SENT = "sent",
  FAILED = "failed",
}

export const EMAIL_LOG_STATUSES = Object.values(EmailLogStatus);

/**
 * One row per outbound email, written by `sendMail()` in config/sendGrid.ts so
 * every email-sending call site is captured without each of them having to
 * remember to log anything. Backs the client-facing "notifications" list.
 */
@Table({
  tableName: "email_logs",
  timestamps: true,
  indexes: [{ name: "idx_email_logs_user_id", fields: ["userId"] }],
})
export class EmailLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  /** Resolved from the recipient address at send time — null when no user
   * account matches (e.g. an internal team/admin address). */
  @ForeignKey(() => User)
  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  userId?: string;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  subject!: string;

  /** The EJS template file name used to render the email, e.g. "welcome.ejs". */
  @AllowNull(true)
  @Column(DataType.STRING(128))
  templateName?: string;

  @AllowNull(false)
  @Default(EmailLogStatus.SENT)
  @Column(DataType.ENUM(...EMAIL_LOG_STATUSES))
  status!: EmailLogStatus;

  @AllowNull(true)
  @Column(DataType.STRING(512))
  errorMessage?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default EmailLog;
