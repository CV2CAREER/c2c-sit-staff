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

// Current-state row per JustCall calendar appointment (appointment.scheduled,
// etc.), upserted on externalId the same way the other JustCall tables are.
// Kept as its own table since a booking (calendar, customer, timezone-aware
// slots, shared_with_agents, external_attendees) isn't tied to any call,
// message, or contact - a different concept entirely. Verified
// "justcall_appointments" doesn't collide with the pre-existing, unrelated
// justcall_* import/sync tables before choosing this name (see the
// justcall_contacts collision fixed on JustCallContact).
@Table({
  tableName: "justcall_appointments",
  timestamps: true,
})
export class JustCallAppointment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // e.g. appointment.scheduled
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

  // data.id - JustCall's own appointment id, stringified, see toExternalId
  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  externalId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  calendarId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  calendarName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  bookedVia?: string;

  // data.type - the appointment's own type (e.g. "Call"), distinct from
  // eventType above (the webhook's type, e.g. "appointment.scheduled")
  @AllowNull(true)
  @Column(DataType.STRING)
  appointmentType?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerFirstName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerLastName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerEmail?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerNumber?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  // full, merged current-state webhook body - the source of truth for
  // anything not promoted to its own column above (calendar_link, timezones,
  // slot timestamps, shared_with_agents, external_attendees)
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
