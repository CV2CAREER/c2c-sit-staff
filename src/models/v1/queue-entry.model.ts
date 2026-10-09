import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  Index,
} from "sequelize-typescript";

export const QUEUE_ENTRY_QUEUES = ["staff", "system"] as const;
export type QueueEntryQueue = (typeof QUEUE_ENTRY_QUEUES)[number];

export const QUEUE_ENTRY_STATUSES = ["open", "resolved"] as const;
export type QueueEntryStatus = (typeof QUEUE_ENTRY_STATUSES)[number];

/**
 * Unified Outstanding-Requests queue behind the Staff and System queue tabs
 * (SPR-21-51-002 / SPR-21-51-003). Customer-queue entries stay in
 * `missing_info_requests` untouched.
 *
 * - staff: internal Database (Housekeeping) tasks (title, raised by, owner,
 *   manual Resolve — no automation fires on resolve).
 * - system: auto-created client self-service actions (client fields, routed
 *   staff, escalating reminders, Actioned resolve requires resolutionNote).
 */
@Table({
  tableName: "queue_entries",
  timestamps: true,
  indexes: [
    { name: "idx_queue_entries_queue", fields: ["queue"] },
    { name: "idx_queue_entries_status", fields: ["status"] },
  ],
})
export class QueueEntry extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.ENUM(...QUEUE_ENTRY_QUEUES))
  queue!: QueueEntryQueue;

  /** Task name (staff) or action description (system). */
  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  raisedById!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  raisedByName!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  assignedToId!: string | null;

  /** Denormalised so the owner stays displayable after deactivation. */
  @AllowNull(true)
  @Column(DataType.STRING)
  assignedToName!: string | null;

  @AllowNull(false)
  @Default("open")
  @Column(DataType.ENUM(...QUEUE_ENTRY_STATUSES))
  status!: QueueEntryStatus;

  @AllowNull(true)
  @Column(DataType.STRING)
  resolvedById!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  resolvedByName!: string | null;

  /** Proof-of-work note; mandatory for system "Actioned" resolve. */
  @AllowNull(true)
  @Column(DataType.TEXT)
  resolutionNote!: string | null;

  /** Optional proof file/image uploaded when the entry was resolved (SPR-21-51-003 follow-up). */
  @AllowNull(true)
  @Column(DataType.JSONB)
  resolutionAttachment!: { url: string; name: string; size: number; mimeType: string } | null;

  // --- system-queue fields (SPR-21-51-003) ---
  @AllowNull(true)
  @Column(DataType.STRING)
  clientId!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  clientName!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  clientEmail!: string | null;

  /** Trigger key of the client action; used for ack-email suppression. */
  @AllowNull(true)
  @Column(DataType.STRING)
  triggerKey!: string | null;

  /** { pc, csm, csc, pcInactive } — routed staff snapshot. */
  @AllowNull(true)
  @Column(DataType.JSONB)
  routedStaff!: Record<string, unknown> | null;

  /** Hours escalated so far (2 → 6 → 12 → 24). */
  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  escalationLevel!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  nextEscalationAt!: Date | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
