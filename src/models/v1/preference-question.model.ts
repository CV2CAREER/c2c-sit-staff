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
  DeletedAt,
  Index,
} from "sequelize-typescript";

export const PREFERENCE_QUESTION_FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "radio",
  "date",
  "checkbox",
] as const;

export type PreferenceQuestionFieldType = (typeof PREFERENCE_QUESTION_FIELD_TYPES)[number];

export const PREFERENCE_QUESTION_VISIBILITIES = ["public", "private"] as const;
export type PreferenceQuestionVisibility = (typeof PREFERENCE_QUESTION_VISIBILITIES)[number];

@Table({
  tableName: "preference_questions",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: "idx_preference_questions_visibility",
      fields: ["visibility"],
    },
    {
      name: "idx_preference_questions_sort_order",
      fields: ["visibility", "sortOrder"],
    },
  ],
})
export class PreferenceQuestion extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  label!: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...PREFERENCE_QUESTION_FIELD_TYPES))
  fieldType!: PreferenceQuestionFieldType;

  @AllowNull(true)
  @Column(DataType.JSONB)
  options!: string[] | null;

  @AllowNull(false)
  @Index
  @Column(DataType.ENUM(...PREFERENCE_QUESTION_VISIBILITIES))
  visibility!: PreferenceQuestionVisibility;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  sortOrder!: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  createdById!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  deletedById!: string | null;

  // System questions (Date of Birth, TIN, SSN, Marital/Disability Status,
  // Veteran) map to dedicated, in some cases encrypted, Profile columns —
  // admin can relabel/reclassify/toggle them but not change fieldType,
  // options, or delete them, since the onboarding screen still renders them
  // as fixed inputs bound to those columns by systemKey.
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isSystem!: boolean;

  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  systemKey!: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt!: Date | null;
}
