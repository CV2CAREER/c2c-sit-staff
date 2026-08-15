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
  BeforeSave,
  AfterCreate,
  BeforeUpdate,
  AfterFind,
} from "sequelize-typescript";
import { User } from "./user.model";
import { MissingInfoType } from "../../types/missingInfoConfig";
import { MissingInfoTemplate } from "./missing-info-template.model";
import { fieldEncryption } from "../../utils/field-encryption";

export const MISSING_INFO_REQUEST_STATUSES = [
  "pending",
  "viewed",
  "in_progress",
  "submitted",
  "expired",
] as const;
export type MissingInfoRequestStatus = (typeof MISSING_INFO_REQUEST_STATUSES)[number];

export const MISSING_INFO_REQUEST_CHANNELS = ["email", "whatsapp"] as const;
export type MissingInfoRequestChannel = (typeof MISSING_INFO_REQUEST_CHANNELS)[number];

@Table({
  tableName: "missing_info_requests",
  timestamps: true,
})
export class MissingInfoRequest extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  targetUserId!: string;

  @BelongsTo(() => User, {
    foreignKey: "targetUserId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  targetUser!: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  requestedById!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  requestedByName!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  missingInfoType!: MissingInfoType;

  @ForeignKey(() => MissingInfoTemplate)
  @AllowNull(true)
  @Column(DataType.STRING)
  templateId!: string;

  @BelongsTo(() => MissingInfoTemplate, {
    foreignKey: "templateId",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  template!: MissingInfoTemplate;

  @AllowNull(true)
  @Column(DataType.STRING)
  token!: string;

  @AllowNull(true)
  @Default("pending")
  @Column(DataType.ENUM(...MISSING_INFO_REQUEST_STATUSES))
  status!: MissingInfoRequestStatus;

  @AllowNull(true)
  @Default("email")
  @Column(DataType.ENUM(...MISSING_INFO_REQUEST_CHANNELS))
  channel!: MissingInfoRequestChannel;

  @Column(DataType.VIRTUAL(DataType.TEXT))
  get personalMessage(): string | null {
    return this.getDataValue("personalMessage") as string | null;
  }
  set personalMessage(value: string | null) {
    this.setDataValue("personalMessage", value);
  }

  @AllowNull(true)
  @Column(DataType.TEXT)
  missingInfoUrl!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  jobURL!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  jobApplicationId!: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  requestedAt!: Date;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  reminderCount!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastReminderAt!: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  fulfilledAt!: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BeforeSave
  static captureAndClearPlaintext(instance: MissingInfoRequest) {
    (instance as any)._pii_personalMessage = instance.getDataValue('personalMessage');
    instance.setDataValue('personalMessage', null);
  }

  @AfterCreate
  static async encryptPersonalMessageOnCreate(instance: MissingInfoRequest, options: any) {
    await fieldEncryption.encryptMissingRequestPersonalMessage(
      instance.id,
      (instance as any)._pii_personalMessage ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptPersonalMessageOnUpdate(instance: MissingInfoRequest, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    if (changed.some(f => ['personalMessage'].includes(f))) {
      await fieldEncryption.encryptMissingRequestPersonalMessage(
        instance.id,
        (instance as any)._pii_personalMessage ?? null,
        options.transaction,
      );
    }
  }

  @AfterFind
  static async decryptPersonalMessage(instances: MissingInfoRequest[] | MissingInfoRequest | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      if (!instance?.id) return;
      try {
        const decrypted = await fieldEncryption.getDecryptedMissingRequestPersonalMessage(instance.id);
        if (decrypted !== null) {
          instance.setDataValue('personalMessage', decrypted);
        }
      } catch {}
    }));
  }
}
