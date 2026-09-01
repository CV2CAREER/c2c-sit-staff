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
import { JustCallSalesDialerCall } from "./justcall-sales-dialer-call.model";

// One row per webhook delivery for a Sales Dialer call, kept even after the
// matching JustCallSalesDialerCall row gets overwritten by a later delivery
// - mirrors justcall-event-log.model.ts for regular calls.
@Table({
  tableName: "justcall_sales_dialer_call_logs",
  timestamps: false,
  indexes: [
    { name: "idx_justcall_sd_call_logs_event_id", fields: ["justCallSalesDialerCallId"] },
    { name: "idx_justcall_sd_call_logs_created_at", fields: ["createdAt"] },
  ],
})
export class JustCallSalesDialerCallLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JustCallSalesDialerCall)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  justCallSalesDialerCallId!: string;

  @BelongsTo(() => JustCallSalesDialerCall, "justCallSalesDialerCallId")
  justCallSalesDialerCall?: JustCallSalesDialerCall;

  // e.g. sd.call_completed
  @AllowNull(false)
  @Column(DataType.STRING)
  eventType!: string;

  // summarizeChanges() output vs. the previous delivery - empty for the
  // first delivery of a call
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
