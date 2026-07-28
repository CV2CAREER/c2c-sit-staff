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
} from "sequelize-typescript";
import { MissingInfoTemplate } from "./missing-info-template.model";

export const MISSING_INFO_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "date",
  "select",
  "textarea",
  "number",
  "file",
  "radio",
  "checkbox",
] as const;

export type MissingInfoFieldType = (typeof MISSING_INFO_FIELD_TYPES)[number];

@Table({
  tableName: "missing_info_template_fields",
  timestamps: true,
  indexes: [
    {
      name: "idx_missing_info_fields_template_id",
      fields: ["templateId"],
    },
    {
      name: "idx_missing_info_fields_sort_order",
      fields: ["templateId", "sortOrder"],
    },
  ],
})
export class MissingInfoTemplateField extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => MissingInfoTemplate)
  @AllowNull(false)
  @Column(DataType.STRING)
  templateId!: string;

  @BelongsTo(() => MissingInfoTemplate, {
    foreignKey: "templateId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  template!: MissingInfoTemplate;

  @AllowNull(false)
  @Column(DataType.STRING)
  fieldName!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  fieldLabel!: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...MISSING_INFO_FIELD_TYPES))
  fieldType!: MissingInfoFieldType;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isRequired!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isVisible!: boolean;

  @AllowNull(true)
  @Column(DataType.JSONB)
  options!: object | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  helpText!: string | null;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  sortOrder!: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isRefereeBlock!: boolean;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  refereeBlockIndex!: number | null;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isRepeatable!: boolean;

  @AllowNull(true)
  @Column(DataType.JSONB)
  validation!: object | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
