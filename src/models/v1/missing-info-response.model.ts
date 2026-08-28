import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  BeforeSave,
  AfterCreate,
  BeforeUpdate,
  AfterFind,
} from "sequelize-typescript";
import { fieldEncryption } from "../../utils/field-encryption";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("missing-info-response.model");

@Table({
  tableName: "missing_info_responses",
  timestamps: true,
  updatedAt: false,
})
export class MissingInfoResponse extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  requestId!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  fieldId!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  fieldName!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  fieldLabel!: string | null;

  @Column(DataType.VIRTUAL(DataType.TEXT))
  get fieldValue(): string | null {
    return this.getDataValue("fieldValue") as string | null;
  }
  set fieldValue(value: string | null) {
    this.setDataValue("fieldValue", value);
  }

  @BeforeSave
  static captureAndClearPlaintext(instance: MissingInfoResponse) {
    (instance as any)._pii_fieldValue = instance.getDataValue("fieldValue");
    instance.setDataValue("fieldValue", null);
  }

  @AfterCreate
  static async encryptFieldValueOnCreate(instance: MissingInfoResponse, options: any) {
    await fieldEncryption.encryptMissingResponseFieldValue(
      instance.id,
      (instance as any)._pii_fieldValue ?? null,
      options.transaction,
    );
  }

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @BeforeUpdate
  static async encryptFieldValueOnUpdate(instance: MissingInfoResponse, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    if (changed.some((f) => ["fieldValue"].includes(f))) {
      await fieldEncryption.encryptMissingResponseFieldValue(
        instance.id,
        (instance as any)._pii_fieldValue ?? null,
        options.transaction,
      );
    }
  }

  @AfterFind
  static async decryptFieldValue(instances: MissingInfoResponse[] | MissingInfoResponse | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(
      list.map(async (instance) => {
        if (!instance?.id) return;
        try {
          const decrypted = await fieldEncryption.getDecryptedMissingResponseFieldValue(instance.id);
          if (decrypted !== null) {
            instance.setDataValue("fieldValue", decrypted);
          }
        } catch (error: any) {
          logger.warn(`Failed to decrypt field value for missing info response ${instance.id}: ${error?.message || error}`);
        }
      }),
    );
  }
}
