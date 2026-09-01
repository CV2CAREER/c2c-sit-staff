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
import { JustCallEvent } from "./justcall-event.model";

// One row per webhook delivery for a call/message, kept even after the
// matching JustCallEvent row gets overwritten by a later delivery - this is
// the append-only audit trail that justcall_events (current state only)
// doesn't retain.
@Table({
  tableName: "justcall_event_logs",
  timestamps: false,
  indexes: [
    { name: "idx_justcall_event_logs_event_id", fields: ["justCallEventId"] },
    { name: "idx_justcall_event_logs_created_at", fields: ["createdAt"] },
  ],
})
export class JustCallEventLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JustCallEvent)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  justCallEventId!: string;

  @BelongsTo(() => JustCallEvent, "justCallEventId")
  justCallEvent?: JustCallEvent;

  // e.g. call.initiated, call.ringing, call.completed, sms.received
  @AllowNull(false)
  @Column(DataType.STRING)
  eventType!: string;

  // summarizeChanges() output vs. the previous delivery - empty for the
  // first delivery of a call/message
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
