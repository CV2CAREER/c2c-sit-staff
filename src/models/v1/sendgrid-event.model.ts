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

// Current-state row per outbound email as tracked by SendGrid's Event
// Webhook, keyed on sg_message_id - completely independent of EmailLog
// (which backs the client-facing notifications list) so nothing here can
// ever alter that table's shape or break what reads it. Mirrors the
// JustCall current-state-row + append-only-log pattern: this table holds
// one row per email, summarizing every event SendGrid has sent for it; see
// SendGridEventLog for the full per-delivery history.
@Table({
  tableName: "sendgrid_events",
  timestamps: true,
})
export class SendGridEvent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // SendGrid's own id for this specific send - the correlation key every
  // event in the batch carries back to us.
  @AllowNull(true)
  @Index
  @Column(DataType.STRING(255))
  sgMessageId?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  email?: string;

  // Most recent event type/time seen for this send, regardless of which
  // specific milestone column below it also updated.
  @AllowNull(true)
  @Column(DataType.STRING(32))
  lastEventType?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastEventAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  deliveredAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  openedAt?: Date;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  openCount!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  clickedAt?: Date;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  clickCount!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  bouncedAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING(512))
  bounceReason?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  droppedAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING(512))
  dropReason?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  unsubscribedAt?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  spamReportedAt?: Date;

  // full, latest event object from SendGrid for this send - the source of
  // truth for anything not promoted to its own column above
  @AllowNull(false)
  @Column(DataType.JSONB)
  payload!: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
