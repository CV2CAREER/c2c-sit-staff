import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./user.model";
import { JobsiteCredential } from "./jobsite-credential.model";

// One row per domain event on a JobsiteCredential: status change, inline
// edit, or password reveal. Distinct from the generic per-HTTP-request
// AuditLog — this answers "who did what to this credential, and when."
@Table({
  tableName: "jobsite_credential_audits",
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ["jobsiteCredentialId"] },
    { fields: ["action"] },
    { fields: ["createdAt"] },
  ],
})
export class JobsiteCredentialAudit extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => JobsiteCredential)
  @AllowNull(false)
  @Column(DataType.STRING)
  jobsiteCredentialId!: string;

  @BelongsTo(() => JobsiteCredential, "jobsiteCredentialId")
  jobsiteCredential!: JobsiteCredential;

  // SUBMITTED | APPROVED | REJECTED | EDITED | PASSWORD_REVEALED
  @AllowNull(false)
  @Column(DataType.STRING)
  action!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  actorId!: string;

  @BelongsTo(() => User, "actorId")
  actor!: User;

  @AllowNull(true)
  @Column(DataType.STRING)
  statusFrom?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  statusTo?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reasonCode?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  note?: string;

  @CreatedAt
  createdAt!: Date;
}

export default JobsiteCredentialAudit;
