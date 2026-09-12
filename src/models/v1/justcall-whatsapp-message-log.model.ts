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
import { JustCallWhatsAppMessage } from "./justcall-whatsapp-message.model";

// One row per webhook delivery for a WhatsApp message, kept even after the
// matching JustCallWhatsAppMessage row gets overwritten by a later delivery
// - mirrors justcall-event-log.model.ts / justcall-message-log.model.ts.
@Table({
  tableName: "justcall_whatsapp_message_logs",
  timestamps: false,
  indexes: [
    { name: "idx_justcall_wa_msg_logs_event_id", fields: ["justCallWhatsAppMessageId"] },
    { name: "idx_justcall_wa_msg_logs_created_at", fields: ["createdAt"] },
  ],
})
export class JustCallWhatsAppMessageLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JustCallWhatsAppMessage)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  justCallWhatsAppMessageId!: string;

  @BelongsTo(() => JustCallWhatsAppMessage, "justCallWhatsAppMessageId")
  justCallWhatsAppMessage?: JustCallWhatsAppMessage;

  // e.g. whatsapp.message_sent, whatsapp.message_received
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
