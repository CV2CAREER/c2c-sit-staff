import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Index,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

// Current-state row per Sales Dialer call (sd.call_completed, etc.), upserted
// on externalId the same way justcall_events is for regular calls. Kept as
// its own table since Sales Dialer's `data` shape (predictive-dialer
// campaign, contact_id, call_answered_by human/machine detection,
// reattempt_number auto-redial counter, duration inline on call_info rather
// than a separate call_duration block) is different enough from a regular
// JustCall call to warrant it, matching the sms.* and whatsapp.* split.
@Table({
  tableName: "justcall_sales_dialer_calls",
  timestamps: true,
})
export class JustCallSalesDialerCall extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // e.g. sd.call_completed
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  eventType!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  requestId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  urlId?: string;

  // data.call_sid, falling back to data.call_id - stringified, see toExternalId
  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  externalId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  campaignId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  campaignName?: string;

  // e.g. Predictive
  @AllowNull(true)
  @Column(DataType.STRING)
  campaignType?: string;

  // data.contact_id - the dialer's CRM-style contact reference, distinct
  // from contactNumber/contactName below
  @AllowNull(true)
  @Column(DataType.STRING)
  contactId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactEmail?: string;

  // data.sales_dialer_number
  @AllowNull(true)
  @Column(DataType.STRING)
  salesDialerNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  agentId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  agentName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  agentEmail?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  direction?: string;

  // call_info.call_answered_by - e.g. Human, Machine, Voicemail
  @AllowNull(true)
  @Column(DataType.STRING)
  callAnsweredBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  disposition?: string;

  // call_info.reattempt_number - which auto-redial attempt this was
  @AllowNull(true)
  @Column(DataType.INTEGER)
  reattemptNumber?: number;

  // full, merged current-state webhook body - the source of truth for
  // anything not promoted to its own column above (including the call
  // recording, re-hosted into Firebase by
  // justcall-sales-dialer-webhook.service.ts)
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
