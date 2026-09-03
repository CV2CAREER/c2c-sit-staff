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
import { JustCallContact } from "./justcall-contact.model";

// One row per webhook delivery for a contact, kept even after the matching
// JustCallContact row gets overwritten by a later delivery - mirrors
// justcall-event-log.model.ts for calls.
@Table({
  tableName: "justcall_contact_event_logs",
  timestamps: false,
  indexes: [
    { name: "idx_justcall_contact_event_logs_contact_id", fields: ["justCallContactId"] },
    { name: "idx_justcall_contact_event_logs_created_at", fields: ["createdAt"] },
  ],
})
export class JustCallContactLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JustCallContact)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  justCallContactId!: string;

  @BelongsTo(() => JustCallContact, "justCallContactId")
  justCallContact?: JustCallContact;

  // e.g. jc.contact_status_updated
  @AllowNull(false)
  @Column(DataType.STRING)
  eventType!: string;

  // summarizeChanges() output vs. the previous delivery - empty for the
  // first delivery of a contact
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
