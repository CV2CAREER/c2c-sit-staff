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
  Unique,
  Index,
  CreatedAt,
} from "sequelize-typescript";
import { SendGridEvent } from "./sendgrid-event.model";

// One row per individual SendGrid event (delivered/open/click/bounce/etc.) -
// SendGrid batches many of these into a single webhook POST, possibly for
// several different emails at once, so each gets logged separately here and
// summarized onto its matching SendGridEvent row. FK -> SendGridEvent only -
// entirely independent of EmailLog. sgEventId is unique because SendGrid
// explicitly documents that it can redeliver the same event more than once -
// this table is the dedup guard.
@Table({
  tableName: "sendgrid_event_logs",
  timestamps: false,
  indexes: [
    { name: "idx_sendgrid_event_logs_sendgrid_event_id", fields: ["sendGridEventId"] },
    { name: "idx_sendgrid_event_logs_created_at", fields: ["createdAt"] },
  ],
})
export class SendGridEventLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => SendGridEvent)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  sendGridEventId!: string;

  @BelongsTo(() => SendGridEvent, "sendGridEventId")
  sendGridEvent?: SendGridEvent;

  // SendGrid's own id for this specific event - unique, used to silently
  // ignore a redelivered event instead of double-counting opens/clicks or
  // re-firing Slack alerts.
  @AllowNull(true)
  @Unique
  @Index
  @Column(DataType.STRING(255))
  sgEventId?: string;

  // e.g. processed, delivered, open, click, bounce, dropped, deferred,
  // spamreport, unsubscribe, group_unsubscribe, group_resubscribe
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(32))
  eventType!: string;

  // SendGrid's own `timestamp` (unix seconds) for when the event occurred,
  // as opposed to createdAt below (when we received/processed it).
  @AllowNull(true)
  @Column(DataType.DATE)
  eventTimestamp?: Date;

  // full, untouched event object from SendGrid's batch
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  @Column(DataType.DATE)
  @Index
  createdAt!: Date;
}
