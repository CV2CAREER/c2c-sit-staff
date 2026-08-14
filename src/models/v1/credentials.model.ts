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
  BeforeCreate,
  BeforeSave,
  AfterCreate,
  BeforeUpdate,
  AfterFind,
} from "sequelize-typescript";
import { literal } from "sequelize";
import { User } from "./user.model";
import { CredentialsTour } from "./credentials-tour.model";
import { SeekExternalCredentials } from "../../types/credentials.types";
import { fieldEncryption } from "../../utils/field-encryption";

@Table({
  tableName: "credentials",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: "idx_credentials_tour_id",
      fields: ["tourId"],
    },
  ],
})
export class Credentials extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string;

  @BeforeCreate
  static async generateId(instance: Credentials) {
    if (!instance.id) {
      const lastCredential = await Credentials.findOne({
        order: [[literal("CAST(id AS INTEGER)"), "DESC"]],
        attributes: ["id"],
        paranoid: false,
      });
      const lastId = lastCredential?.id;
      const lastNumericId = lastId ? parseInt(lastId, 10) : 0;
      instance.id = isNaN(lastNumericId) ? "1" : String(lastNumericId + 1);
    }
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get seekEmail(): string | undefined {
    return this.getDataValue("seekEmail") as string | undefined;
  }
  set seekEmail(value: string | undefined) {
    this.setDataValue("seekEmail", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get seekPassword(): string | undefined {
    return this.getDataValue("seekPassword") as string | undefined;
  }
  set seekPassword(value: string | undefined) {
    this.setDataValue("seekPassword", value);
  }

  @AllowNull(true)
  @Column(DataType.STRING(32))
  seekCredentialsTest?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  seekCredentialsTestDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  currentCity?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  onboardingDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  criteriaReviewCompleted?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  referrer?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  blacklisted?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  seekLoginType?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  seekExternalCredentials?: SeekExternalCredentials;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  clientId?: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  client?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @Column(DataType.DATE)
  deletedAt?: Date;

  @Column(DataType.VIRTUAL(DataType.STRING))
  get AssignedPCName(): string | undefined {
    return this.getDataValue("AssignedPCName") as string | undefined;
  }
  set AssignedPCName(value: string | undefined) {
    this.setDataValue("AssignedPCName", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get AssignedPCEmail(): string | undefined {
    return this.getDataValue("AssignedPCEmail") as string | undefined;
  }
  set AssignedPCEmail(value: string | undefined) {
    this.setDataValue("AssignedPCEmail", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get AssignedVetName(): string | undefined {
    return this.getDataValue("AssignedVetName") as string | undefined;
  }
  set AssignedVetName(value: string | undefined) {
    this.setDataValue("AssignedVetName", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get AssignedVetEmail(): string | undefined {
    return this.getDataValue("AssignedVetEmail") as string | undefined;
  }
  set AssignedVetEmail(value: string | undefined) {
    this.setDataValue("AssignedVetEmail", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get AssignedCompletedName(): string | undefined {
    return this.getDataValue("AssignedCompletedName") as string | undefined;
  }
  set AssignedCompletedName(value: string | undefined) {
    this.setDataValue("AssignedCompletedName", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get AssignedCompletedEmail(): string | undefined {
    return this.getDataValue("AssignedCompletedEmail") as string | undefined;
  }
  set AssignedCompletedEmail(value: string | undefined) {
    this.setDataValue("AssignedCompletedEmail", value);
  }

  @AllowNull(true)
  @Default('FLIGHT')
  @Column(DataType.STRING(32))
  capitalized?: string;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  Active?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  SeekAnswerPriority?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  SeekAggregator?: boolean;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  SeekSubStartDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  updatedBy?: string;
  
  // The client's current/latest tour on this credentials account — tour 1
  // right after first payment, then repointed to the newest tour every time
  // a renewal opens another one (see createCredentialsTour).
  @ForeignKey(() => CredentialsTour)
  @AllowNull(true)
  @Column(DataType.UUID)
  tourId?: string;

  @BelongsTo(() => CredentialsTour, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  tour?: CredentialsTour;

  @BeforeSave
  static captureAndClearPlaintext(instance: Credentials) {
    (instance as any)._pii_seekEmail = instance.getDataValue('seekEmail');
    (instance as any)._pii_seekPassword = instance.getDataValue('seekPassword');
    (instance as any)._pii_AssignedPCName = instance.getDataValue('AssignedPCName');
    (instance as any)._pii_AssignedPCEmail = instance.getDataValue('AssignedPCEmail');
    (instance as any)._pii_AssignedVetName = instance.getDataValue('AssignedVetName');
    (instance as any)._pii_AssignedVetEmail = instance.getDataValue('AssignedVetEmail');
    (instance as any)._pii_AssignedCompletedName = instance.getDataValue('AssignedCompletedName');
    (instance as any)._pii_AssignedCompletedEmail = instance.getDataValue('AssignedCompletedEmail');
    instance.setDataValue('seekEmail', null);
    instance.setDataValue('seekPassword', null);
    instance.setDataValue('AssignedPCName', null);
    instance.setDataValue('AssignedPCEmail', null);
    instance.setDataValue('AssignedVetName', null);
    instance.setDataValue('AssignedVetEmail', null);
    instance.setDataValue('AssignedCompletedName', null);
    instance.setDataValue('AssignedCompletedEmail', null);
  }

  @AfterCreate
  static async encryptSensitiveFieldsOnCreate(instance: Credentials, options: any) {
    const pii = instance as any;
    await fieldEncryption.encryptCredentialFields(
      instance.id,
      pii._pii_seekPassword ?? null,
      options.transaction,
    );
    await fieldEncryption.encryptCredentialExtendedFields(
      instance.id,
      pii._pii_seekEmail ?? null,
      pii._pii_AssignedPCName ?? null,
      pii._pii_AssignedPCEmail ?? null,
      pii._pii_AssignedVetName ?? null,
      pii._pii_AssignedVetEmail ?? null,
      pii._pii_AssignedCompletedName ?? null,
      pii._pii_AssignedCompletedEmail ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptSensitiveFieldsOnUpdate(instance: Credentials, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    const pii = instance as any;
    if (changed.some(f => ['seekPassword'].includes(f))) {
      await fieldEncryption.encryptCredentialFields(
        instance.id,
        pii._pii_seekPassword ?? null,
        options.transaction,
      );
    }
    if (changed.some(f => ['seekEmail', 'AssignedPCName', 'AssignedPCEmail', 'AssignedVetName', 'AssignedVetEmail', 'AssignedCompletedName', 'AssignedCompletedEmail'].includes(f))) {
      await fieldEncryption.encryptCredentialExtendedFields(
        instance.id,
        pii._pii_seekEmail ?? null,
        pii._pii_AssignedPCName ?? null,
        pii._pii_AssignedPCEmail ?? null,
        pii._pii_AssignedVetName ?? null,
        pii._pii_AssignedVetEmail ?? null,
        pii._pii_AssignedCompletedName ?? null,
        pii._pii_AssignedCompletedEmail ?? null,
        options.transaction,
      );
    }
  }

  @AfterFind
  static async decryptSensitiveFields(instances: Credentials[] | Credentials | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      try {
        const pw = await fieldEncryption.getDecryptedSeekPassword(instance.id);
        if (pw !== null) instance.setDataValue('seekPassword', pw);
      } catch {}
      try {
        const ext = await fieldEncryption.getDecryptedCredentialExtended(instance.id);
        if (ext) {
          if (ext.seekEmail) instance.setDataValue('seekEmail', ext.seekEmail);
          if (ext.AssignedPCName) instance.setDataValue('AssignedPCName', ext.AssignedPCName);
          if (ext.AssignedPCEmail) instance.setDataValue('AssignedPCEmail', ext.AssignedPCEmail);
          if (ext.AssignedVetName) instance.setDataValue('AssignedVetName', ext.AssignedVetName);
          if (ext.AssignedVetEmail) instance.setDataValue('AssignedVetEmail', ext.AssignedVetEmail);
          if (ext.AssignedCompletedName) instance.setDataValue('AssignedCompletedName', ext.AssignedCompletedName);
          if (ext.AssignedCompletedEmail) instance.setDataValue('AssignedCompletedEmail', ext.AssignedCompletedEmail);
        }
      } catch {}
    }));
  }
}
