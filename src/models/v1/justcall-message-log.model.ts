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
  Index,
} from "sequelize-typescript";
import { JustCallMessageEvent } from "./justcall-message.model";

// One row per webhook delivery for a message, kept even after the matching
// JustCallMessageEvent row gets overwritten by a later delivery - mirrors
// justcall-event-log.model.ts for calls.
@Table({
  tableName: "justcall_message_event_logs",
  timestamps: false,
  indexes: [
    { name: "idx_justcall_message_event_logs_event_id", fields: ["justCallMessageEventId"] },
    { name: "idx_justcall_message_event_logs_created_at", fields: ["createdAt"] },
  ],
})
export class JustCallMessageEventLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JustCallMessageEvent)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  justCallMessageEventId!: string;

  @BelongsTo(() => JustCallMessageEvent, "justCallMessageEventId")
  justCallMessageEvent?: JustCallMessageEvent;

  // e.g. sms.sent, sms.received
  @AllowNull(false)
  @Column(DataType.STRING)
  eventType!: string;

  // summarizeChanges() output vs. the previous delivery - empty for the
  // first delivery of a message
  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  changes!: string[];

  // full, untouched webhook body for this specific delivery
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  @Column(DataType.DATE)
  @Index
  createdAt!: Date;
}
