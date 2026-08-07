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
  DeletedAt,
} from "sequelize-typescript";
import { User } from "./user.model";
import { CredentialsTour } from "./credentials-tour.model";
import {
  ClientJourneyActorType,
  ClientJourneyPhase,
  ClientJourneySource,
  ClientJourneyStepStatus,
} from "../../utils/enum";

/**
 * One row per COMPLETED client journey step — incomplete steps simply have
 * no row. "current" vs "awaiting" is a derived, presentation-layer concept
 * (computed by the frontend from the ordered step registry + these rows),
 * not stored here.
 *
 * `tourId` is null for one-time, account-level steps (Getting Started) and
 * set to the CredentialsTour active at completion time for everything else,
 * so a client who pays for a second campaign cycle gets a fresh Welcome →
 * What's Next journey without losing the history of their first one
 * (soft-deleted rows are never hard-deleted — see paranoid below).
 */
@Table({
  tableName: "client_journey_steps",
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ["userId"] },
    { fields: ["tourId"] },
    // Backstop for tour-scoped rows. Postgres treats multiple NULL tourIds as
    // distinct, so this alone doesn't guard the account-level (tourId null)
    // case — completeStep() always finds-before-creating, which does.
    { unique: true, fields: ["userId", "tourId", "stepKey"] },
  ],
})
export class ClientJourneyStep extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, "userId")
  user?: User;

  @ForeignKey(() => CredentialsTour)
  @AllowNull(true)
  @Column(DataType.UUID)
  tourId?: string;

  @BelongsTo(() => CredentialsTour, "tourId")
  tour?: CredentialsTour;

  @AllowNull(false)
  @Column(DataType.STRING)
  phaseKey!: ClientJourneyPhase;

  @AllowNull(false)
  @Column(DataType.STRING)
  stepKey!: string;

  @AllowNull(false)
  @Default(ClientJourneyStepStatus.DONE)
  @Column(DataType.ENUM(...Object.values(ClientJourneyStepStatus)))
  status!: ClientJourneyStepStatus;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  completedAt!: Date;

  // Plain string, deliberately NOT FK-constrained to User — mirrors
  // AuditLogCustomer.actorId rather than JobsiteCredentialAudit's stricter FK,
  // because automatic completions record "SYSTEM" as the actor, which no
  // real User row can satisfy.
  @AllowNull(false)
  @Column(DataType.STRING)
  actorId!: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(ClientJourneyActorType)))
  actorType!: ClientJourneyActorType;

  @AllowNull(false)
  @Default(ClientJourneySource.AUTOMATIC)
  @Column(DataType.ENUM(...Object.values(ClientJourneySource)))
  source!: ClientJourneySource;

  @AllowNull(true)
  @Column(DataType.TEXT)
  note?: string;

  // Who reopened/soft-deleted this completion, if it was ever undone.
  @AllowNull(true)
  @Column(DataType.STRING)
  deletedBy?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date;
}

export default ClientJourneyStep;
