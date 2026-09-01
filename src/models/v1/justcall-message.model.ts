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

// Current-state row per SMS/MMS message (sms.sent, sms.received, etc.),
// upserted on externalId the same way justcall_events is for calls - see
// justcall-message-webhook.service.ts. Kept as its own table/model rather
// than sharing justcall_events since a message's shape (sms_info, mms
// attachments, delivery_status) has almost no overlap with a call's
// (call_info, call_duration, queue, justcall_iq) beyond contact/agent
// metadata.
@Table({
  tableName: "justcall_message_events",
  timestamps: true,
})
export class JustCallMessageEvent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // e.g. sms.sent, sms.received
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

  // data.id (JustCall's message id) - stringified, see toExternalId
  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  externalId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactEmail?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  justcallNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  justcallLineName?: string;

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

  // data.delivery_status
  @AllowNull(true)
  @Column(DataType.STRING)
  deliveryStatus?: string;

  // sms_info.body
  @AllowNull(true)
  @Column(DataType.TEXT)
  body?: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isMms!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  medium?: string;

  // full, merged current-state webhook body - the source of truth for
  // anything not promoted to its own column above (including mms[] media,
  // re-hosted into Firebase by justcall-message-webhook.service.ts)
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
