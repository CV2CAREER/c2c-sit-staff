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

  @AllowNull(true)
  seekEmail?: string;

  @AllowNull(true)
  seekPassword?: string;

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

  @AllowNull(true)
  AssignedPCName?: string;

  @AllowNull(true)
  AssignedPCEmail?: string;

  @AllowNull(true)
  AssignedVetName?: string;

  @AllowNull(true)
  AssignedVetEmail?: string;

  @AllowNull(true)
  AssignedCompletedName?: string;

  @AllowNull(true)
  AssignedCompletedEmail?: string;

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

  @AfterCreate
  static async encryptSensitiveFieldsOnCreate(instance: Credentials, options: any) {
    await fieldEncryption.encryptCredentialFields(
      instance.id,
      instance.seekPassword ?? null,
      options.transaction,
    );
    await fieldEncryption.encryptCredentialExtendedFields(
      instance.id,
      instance.seekEmail ?? null,
      instance.AssignedPCName ?? null,
      instance.AssignedPCEmail ?? null,
      instance.AssignedVetName ?? null,
      instance.AssignedVetEmail ?? null,
      instance.AssignedCompletedName ?? null,
      instance.AssignedCompletedEmail ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptSensitiveFieldsOnUpdate(instance: Credentials, options: any) {
    await fieldEncryption.encryptCredentialFields(
      instance.id,
      instance.seekPassword ?? null,
      options.transaction,
    );
    await fieldEncryption.encryptCredentialExtendedFields(
      instance.id,
      instance.seekEmail ?? null,
      instance.AssignedPCName ?? null,
      instance.AssignedPCEmail ?? null,
      instance.AssignedVetName ?? null,
      instance.AssignedVetEmail ?? null,
      instance.AssignedCompletedName ?? null,
      instance.AssignedCompletedEmail ?? null,
      options.transaction,
    );
  }

  @AfterFind
  static async decryptSensitiveFields(instances: Credentials[] | Credentials | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      const encPw = instance.getDataValue('seekPasswordEncrypted');
      if (encPw) {
        const pw = await fieldEncryption.getDecryptedSeekPassword(instance.id);
        if (pw !== null) instance.set('seekPassword', pw);
      }
      const encSeekEmail = instance.getDataValue('seekEmailEncrypted');
      if (encSeekEmail) {
        const ext = await fieldEncryption.getDecryptedCredentialExtended(instance.id);
        if (ext) {
          instance.set('seekEmail', ext.seekEmail);
          instance.set('AssignedPCName', ext.AssignedPCName);
          instance.set('AssignedPCEmail', ext.AssignedPCEmail);
          instance.set('AssignedVetName', ext.AssignedVetName);
          instance.set('AssignedVetEmail', ext.AssignedVetEmail);
          instance.set('AssignedCompletedName', ext.AssignedCompletedName);
          instance.set('AssignedCompletedEmail', ext.AssignedCompletedEmail);
        }
      }
    }));
  }
}
