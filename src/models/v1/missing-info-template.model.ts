import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  HasMany,
  CreatedAt,
  UpdatedAt,
  Index,
} from "sequelize-typescript";
import { MissingInfoTemplateField } from "./missing-info-template-field.model";

export const MISSING_INFO_CATEGORIES = [
  "identity",
  "work_rights",
  "references",
  "certifications",
  "banking",
  "housekeeping",
] as const;

export type MissingInfoCategory = (typeof MISSING_INFO_CATEGORIES)[number];

export const MISSING_INFO_TEMPLATE_TYPES = ["referee_block", "free_form"] as const;
export type MissingInfoTemplateType = (typeof MISSING_INFO_TEMPLATE_TYPES)[number];

export const MISSING_INFO_TEMPLATE_STATUSES = ["draft", "published"] as const;
export type MissingInfoTemplateStatus = (typeof MISSING_INFO_TEMPLATE_STATUSES)[number];

@Table({
  tableName: "missing_info_templates",
  timestamps: true,
  indexes: [
    {
      name: "idx_missing_info_templates_name",
      fields: ["name"],
    },
    {
      name: "idx_missing_info_templates_category",
      fields: ["category"],
    },
    {
      name: "idx_missing_info_templates_status",
      fields: ["status"],
    },
  ],
})
export class MissingInfoTemplate extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...MISSING_INFO_CATEGORIES))
  category!: MissingInfoCategory;

  @AllowNull(false)
  @Column(DataType.ENUM(...MISSING_INFO_TEMPLATE_TYPES))
  type!: MissingInfoTemplateType;

  @AllowNull(false)
  @Default("draft")
  @Column(DataType.ENUM(...MISSING_INFO_TEMPLATE_STATUSES))
  status!: MissingInfoTemplateStatus;

  // "What this involves" text for Database (Housekeeping) task templates (SPR-21-51-002).
  @AllowNull(true)
  @Column(DataType.TEXT)
  description!: string | null;

  @AllowNull(false)
  @Column(DataType.STRING)
  createdById!: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  publishCount!: number;

  @HasMany(() => MissingInfoTemplateField, {
    foreignKey: "templateId",
    as: "fields",
  })
  fields!: MissingInfoTemplateField[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
