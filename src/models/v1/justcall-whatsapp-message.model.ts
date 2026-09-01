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

// Current-state row per WhatsApp message (whatsapp.message_sent,
// whatsapp.message_received, etc.), upserted on externalId the same way
// justcall_events/justcall_message_events are. Kept as its own table since a
// WhatsApp message's shape (reactions, read receipts, business templates
// with their own header media) has almost no overlap with a call's or a
// plain SMS's beyond contact/agent metadata.
@Table({
  tableName: "justcall_whatsapp_messages",
  timestamps: true,
})
export class JustCallWhatsAppMessage extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // e.g. whatsapp.message_sent, whatsapp.message_received
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

  // data.message_origin - e.g. "web"
  @AllowNull(true)
  @Column(DataType.STRING)
  messageOrigin?: string;

  // message_info.body
  @AllowNull(true)
  @Column(DataType.TEXT)
  body?: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isMms!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isTemplate!: boolean;

  // message_info.template.template_name, when isTemplate
  @AllowNull(true)
  @Column(DataType.STRING)
  templateName?: string;

  // full, merged current-state webhook body - the source of truth for
  // anything not promoted to its own column above (including the mms
  // attachment and template header image, re-hosted into Firebase by
  // justcall-whatsapp-webhook.service.ts)
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
