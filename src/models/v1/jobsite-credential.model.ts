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
  ForeignKey,
  BelongsTo,
  AfterCreate,
  BeforeUpdate,
  AfterFind,
} from "sequelize-typescript";
import { User } from "./user.model";
import {
  JobsiteCredentialStatus,
  JobsiteCredentialRejectionReason,
} from "../../utils/enum";
import { fieldEncryption } from "../../utils/field-encryption";

@Table({
  tableName: "jobsite_credentials",
  timestamps: true,
  paranoid: true,
})
export class JobsiteCredential extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  clientId!: string;

  @BelongsTo(() => User, "clientId")
  client!: User;

  // The client-supplied application email. Never the client's real
  // mailbox password — that is never requested or stored.
  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  // System-generated password for the jobsite accounts the SPC opens
  // manually. Not the client's own credential.
  @AllowNull(true)
  @Column(DataType.STRING)
  generatedPassword?: string;

  @AllowNull(false)
  @Default(JobsiteCredentialStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(JobsiteCredentialStatus)))
  status!: JobsiteCredentialStatus;

  @AllowNull(true)
  @Column(DataType.ENUM(...Object.values(JobsiteCredentialRejectionReason)))
  rejectionReason?: JobsiteCredentialRejectionReason;

  @AllowNull(true)
  @Column(DataType.TEXT)
  rejectionNote?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  approvedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  approvedAt?: Date;

  // Set once the SPC has manually created the client's accounts across
  // aggregators/job boards/company career pages. Approved is not the
  // same as working — this is how that gap gets tracked.
  @AllowNull(true)
  @Column(DataType.DATE)
  accountsCreatedAt?: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  clientNotified!: boolean;

  // Set when the client clicks "I have completed the email forwarding
  // process" — this is what moves status PENDING -> FORWARDED. Cleared
  // whenever the email is resubmitted/updated, since a new address needs
  // its own confirmation. (Redesign's delegated_by_client_at.)
  @AllowNull(true)
  @Column(DataType.DATE)
  forwardedAt?: Date;

  // Admin clicked Accept — moves FORWARDED -> ACCEPTED. Client can no
  // longer edit their email from this point on. Admin can now send Test
  // emails freely and eventually make a Decision (Approve/Reject).
  @AllowNull(true)
  @Column(DataType.DATE)
  acceptedAt?: Date;

  // Timestamp of the most recent Test email send. Purely informational —
  // sending a Test does NOT change status or gate anything; it can be
  // clicked any number of times while ACCEPTED.
  @AllowNull(true)
  @Column(DataType.DATE)
  testedAt?: Date;

  // Set once the stalled-setup nudge email has fired (cron job lives in
  // c2c-iat-customer-backend), so it never sends the nudge twice for the
  // same forwarding attempt. Cleared on email resubmit/update.
  @AllowNull(true)
  @Column(DataType.DATE)
  stalledEmailSentAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @AfterCreate
  static async encryptSensitiveFieldsOnCreate(instance: JobsiteCredential, options: any) {
    await fieldEncryption.encryptJobsiteCredentialFields(
      instance.id,
      instance.email ?? null,
      instance.generatedPassword ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptSensitiveFieldsOnUpdate(instance: JobsiteCredential, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    const sensitive = ['email', 'generatedPassword'];
    if (!sensitive.some(f => changed.includes(f))) return;
    await fieldEncryption.encryptJobsiteCredentialFields(
      instance.id,
      instance.email ?? null,
      instance.generatedPassword ?? null,
      options.transaction,
    );
  }

  @AfterFind
  static async decryptSensitiveFields(instances: JobsiteCredential[] | JobsiteCredential | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      const encEmail = instance.getDataValue('emailEncrypted');
      if (!encEmail) return;
      const decrypted = await fieldEncryption.getDecryptedJobsiteCredential(instance.id);
      if (!decrypted) return;
      instance.set('email', decrypted.email);
      instance.set('generatedPassword', decrypted.generatedPassword);
    }));
  }
}

export default JobsiteCredential;
