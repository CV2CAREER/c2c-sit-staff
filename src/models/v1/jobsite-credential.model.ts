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
  BeforeSave,
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
  @AllowNull(true)
  @Column(DataType.STRING)
  email!: string;

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

  @BeforeSave
  static captureAndClearPlaintext(instance: JobsiteCredential) {
    (instance as any)._pii_email = instance.getDataValue('email');
    (instance as any)._pii_generatedPassword = instance.getDataValue('generatedPassword');
    instance.setDataValue('email', null);
    instance.setDataValue('generatedPassword', null);
  }

  @AfterCreate
  static async encryptSensitiveFieldsOnCreate(instance: JobsiteCredential, options: any) {
    const pii = instance as any;
    await fieldEncryption.encryptJobsiteCredentialFields(
      instance.id,
      pii._pii_email ?? null,
      pii._pii_generatedPassword ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptSensitiveFieldsOnUpdate(instance: JobsiteCredential, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    if (changed.some(f => ['email', 'generatedPassword'].includes(f))) {
      await fieldEncryption.encryptJobsiteCredentialFields(
        instance.id,
        (instance as any)._pii_email ?? null,
        (instance as any)._pii_generatedPassword ?? null,
        options.transaction,
      );
    }
  }

  @AfterFind
  static async decryptSensitiveFields(instances: JobsiteCredential[] | JobsiteCredential | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      try {
        const decrypted = await fieldEncryption.getDecryptedJobsiteCredential(instance.id);
        if (!decrypted) return;
        if (decrypted.email) instance.setDataValue('email', decrypted.email);
        if (decrypted.generatedPassword) instance.setDataValue('generatedPassword', decrypted.generatedPassword);
      } catch {}
    }));
  }
}

export default JobsiteCredential;
