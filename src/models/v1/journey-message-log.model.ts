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
  Index,
} from "sequelize-typescript";

export enum JourneyMessageLogStatus {
  SENT = "sent",
  FAILED = "failed",
}

export const JOURNEY_MESSAGE_LOG_STATUSES = Object.values(JourneyMessageLogStatus);

/**
 * SPR-21-11-007 — the audit trail the Confirmation Messages Sent step
 * (journey step 9) never had. One row per component message dispatched when
 * the step is attested: message type, recipient and timestamp, exactly what
 * the DoD's "log table" task asks for.
 *
 * Deliberately has NO foreign keys: an audit record must survive deletion of
 * the accounts it references, so userId / triggeredByAdminId are plain
 * strings rather than cascading FKs. Complements (does not replace) the
 * email_logs row sendMail() already writes per send.
 */
@Table({
  tableName: "journey_message_logs",
  timestamps: true,
  indexes: [{ name: "idx_journey_message_logs_user_id", fields: ["userId"] }],
})
export class JourneyMessageLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  /** The client the message was dispatched for. */
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  userId!: string;

  /** Journey step whose attest triggered the dispatch, e.g. "confirmation_sent". */
  @AllowNull(false)
  @Column(DataType.STRING(64))
  stepKey!: string;

  /** Which component message, e.g. "social_follow", "session_details", "rtr_cv_info". */
  @AllowNull(false)
  @Column(DataType.STRING(64))
  messageType!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  recipientEmail!: string;

  @AllowNull(false)
  @Default(JourneyMessageLogStatus.SENT)
  @Column(DataType.ENUM(...JOURNEY_MESSAGE_LOG_STATUSES))
  status!: JourneyMessageLogStatus;

  @AllowNull(true)
  @Column(DataType.STRING(512))
  errorMessage?: string;

  /** The admin whose attest triggered the dispatch. */
  @AllowNull(false)
  @Column(DataType.STRING)
  triggeredByAdminId!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default JourneyMessageLog;
