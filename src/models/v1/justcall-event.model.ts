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

@Table({
  tableName: "justcall_events",
  timestamps: true,
})
export class JustCallEvent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // e.g. call.initiated, call.ringing, call.completed, sms.received, sms.sent
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  eventType!: string;

  // request_id from the webhook envelope (JustCall's id for this webhook delivery)
  @AllowNull(true)
  @Column(DataType.STRING)
  requestId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  urlId?: string;

  // data.call_sid for call.* events, data.id / data.sms_id for sms.* events
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

  // call_info.direction for calls, blank for sms
  @AllowNull(true)
  @Column(DataType.STRING)
  direction?: string;

  // call_info.status for calls, generic status for sms
  @AllowNull(true)
  @Column(DataType.STRING)
  status?: string;

  // full, untouched webhook body - the source of truth for anything not
  // promoted to its own column above
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
