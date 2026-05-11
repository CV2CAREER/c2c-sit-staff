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
  UpdatedAt,
  Index,
} from "sequelize-typescript";
import {
  EvidenceType,
  PrepStatus,
  SessionStatus,
  SessionType,
  ValidationStatus,
} from "../../utils/enum";
import {
  Evidence,
  Grading,
  SessionTime,
} from "../../types/session.types";
import { User } from "./user.model";
import { Schedule } from "./schedule.model";

@Table({
  tableName: "sessions",
  timestamps: true,
  indexes: [
    {
      name: "idx_session_evidence_link",
      fields: ["evidenceLink"],
    },
    {
      name: "idx_session_evidence_type",
      fields: ["evidenceType"],
    },
    {
      name: "idx_session_prep_status",
      fields: ["prepStatus"],
    },
    {
      name: "idx_session_status",
      fields: ["sessionStatus"],
    },
    {
      name: "idx_session_type",
      fields: ["sessionType"],
    },
    {
      name: "idx_session_client",
      fields: ["clientId"],
    },
    {
      name: "idx_session_coach",
      fields: ["coachId"],
    },
    {
      name: "idx_session_created_at",
      fields: ["createdAt"],
    },
  ],
})
export class Session extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  chatSessionId?: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(SessionType)))
  sessionType!: SessionType;

  @AllowNull(false)
  @Default(SessionStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(SessionStatus)))
  sessionStatus!: SessionStatus;

  // Time stored as JSONB for startTime and endTime
  @AllowNull(true)
  @Column(DataType.JSONB)
  time?: SessionTime;

  @AllowNull(false)
  @Default(30)
  @Column(DataType.INTEGER)
  duration!: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description?: string;

  @AllowNull(true)
  @Default("https://meet.google.com/ipd-yhtc-kkg")
  @Column(DataType.STRING)
  meetingLink?: string;

  // Reference to Schedule model (if exists)
  @ForeignKey(() => Schedule)
  @AllowNull(true)
  @Column(DataType.STRING)
  scheduleId?: string;

  @BelongsTo(() => Schedule, "scheduleId")
  schedule?: Schedule;

  // Grading stored as JSONB
  @AllowNull(true)
  @Column(DataType.JSONB)
  grading?: Grading;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isGraded!: boolean;

  // Client (User) reference
  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  clientId?: string;

  @BelongsTo(() => User, "clientId")
  client?: User;

  // Coach (User) reference
  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  coachId?: string;

  @BelongsTo(() => User, "coachId")
  coach?: User;

  @AllowNull(true)
  @Column(DataType.STRING)
  timezone?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  eventId?: string;

  // ========== NEW FLAT FIELDS FOR EASIER QUERYING ==========

  /**
   * Primary evidence link (first uploaded file or URL)
   * For quick access without querying nested arrays
   */
  @AllowNull(true)
  @Column(DataType.STRING)
  evidenceLink?: string;

  /**
   * Type of primary evidence
   * 'file' - Uploaded file stored in Firebase
   * 'url' - External URL link
   * 'multiple' - Multiple evidence items (check evidence.links array)
   */
  @AllowNull(true)
  @Column(DataType.ENUM(...Object.values(EvidenceType)))
  evidenceType?: EvidenceType;

  /**
   * Interview preparation status
   * Tracks the user's progress through interview prep
   */
  @AllowNull(false)
  @Default(PrepStatus.NOT_STARTED)
  @Column(DataType.ENUM(...Object.values(PrepStatus)))
  prepStatus!: PrepStatus;

  // ========== EVIDENCE STRUCTURE (for detailed info) ==========

  // Evidence stored as JSONB containing all evidence details
  @AllowNull(true)
  @Column(DataType.JSONB)
  evidence?: Evidence;

  // ========== DEPRECATED FIELDS (kept for backward compatibility) ==========

  @AllowNull(false)
  @Default(PrepStatus.NOT_STARTED)
  @Column(DataType.ENUM(...Object.values(PrepStatus)))
  prepStatusLegacy!: PrepStatus;

  @AllowNull(true)
  @Column(DataType.DATE)
  prepCompletedAt?: Date;

  // Note: requiresEvidence moved to evidence.requiresEvidence
  // Keeping this for backward compatibility but marking as deprecated
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  requiresEvidence!: boolean;

  @AllowNull(false)
  @Default(ValidationStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(ValidationStatus)))
  validationStatus!: ValidationStatus;

  @AllowNull(true)
  @Column(DataType.TEXT)
  validationNotes?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  validatedAt?: Date;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  validatedBy?: string;

  @BelongsTo(() => User, "validatedBy")
  validator?: User;

  // Timestamps
  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}