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

// Current-state row per JustCall contact (jc.contact_status_updated, etc.),
// upserted on externalId the same way the other JustCall tables are. Kept
// as its own table since a contact record (name, other_numbers, notes,
// blacklist/dnd/dnm compliance flags) isn't tied to any call or message at
// all - a different concept from call, sms, whatsapp, or sd events.
//
// Named justcall_contact_events (not justcall_contacts) because a separate,
// pre-existing table already owns that name - an unrelated periodic
// import/sync job with its own schema (rawjson/importedat columns). Reusing
// "justcall_contacts" here caused Sequelize to treat this model's table as
// already created and skip creating our columns, while still trying to
// index eventType on the other system's table - "column eventType does not
// exist".
@Table({
  tableName: "justcall_contact_events",
  timestamps: true,
})
export class JustCallContact extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // e.g. jc.contact_status_updated
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

  // data.id - JustCall's own contact id, stringified, see toExternalId
  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  externalId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  name?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  contactNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  email?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  company?: string;

  // the JustCall agent this contact is assigned/owned by
  @AllowNull(true)
  @Column(DataType.STRING)
  agentId?: string;

  // data.status.blacklist/dnd/dnm - compliance flags worth being able to
  // query directly (e.g. "never call blacklisted contacts")
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  blacklist!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  dnd!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  dnm!: boolean;

  // full, merged current-state webhook body - the source of truth for
  // anything not promoted to its own column above (other_numbers, notes,
  // extension, address, timestamps)
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
