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
import { JustCallAppointment } from "./justcall-appointment.model";

// One row per webhook delivery for an appointment, kept even after the
// matching JustCallAppointment row gets overwritten by a later delivery -
// mirrors justcall-event-log.model.ts for calls.
@Table({
  tableName: "justcall_appointment_logs",
  timestamps: false,
  indexes: [
    { name: "idx_justcall_appointment_logs_appt_id", fields: ["justCallAppointmentId"] },
    { name: "idx_justcall_appointment_logs_created_at", fields: ["createdAt"] },
  ],
})
export class JustCallAppointmentLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JustCallAppointment)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  justCallAppointmentId!: string;

  @BelongsTo(() => JustCallAppointment, "justCallAppointmentId")
  justCallAppointment?: JustCallAppointment;

  // e.g. appointment.scheduled
  @AllowNull(false)
  @Column(DataType.STRING)
  eventType!: string;

  // summarizeChanges() output vs. the previous delivery - empty for the
  // first delivery of an appointment
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
