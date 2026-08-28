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
} from "sequelize-typescript";

export const DROPDOWN_OPTION_LIST_KEYS = [
  "job_types",
  "advertisers",
  "industries",
  "situations",
  "salary_amounts",
  "working_rights",
] as const;

export type DropdownOptionListKey = (typeof DROPDOWN_OPTION_LIST_KEYS)[number];

// One table covers every category's shape: flat lists (job_types,
// advertisers, situations) use parentId=null rows only; grouped categories
// (industries -> classifications, salary_amounts -> amounts by period,
// working_rights -> per-country entries) use parentId to nest children under
// their top-level row. `value` must match what's already persisted in saved
// customer preference records (advertiser names, classification ids, salary
// amounts, country keys) — it is never regenerated once seeded.
@Table({
  tableName: "dropdown_options",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: "idx_dropdown_options_list_key",
      fields: ["listKey"],
    },
    {
      name: "idx_dropdown_options_list_parent_sort",
      fields: ["listKey", "parentId", "sortOrder"],
    },
    {
      name: "idx_dropdown_options_parent_id",
      fields: ["parentId"],
    },
    {
      name: "uq_dropdown_options_value_per_group",
      unique: true,
      fields: ["listKey", "parentId", "value"],
      where: { deletedAt: null },
    },
  ],
})
export class DropdownOption extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...DROPDOWN_OPTION_LIST_KEYS))
  listKey!: DropdownOptionListKey;

  // Not a DB-level FK constraint on purpose — keeps parent/child cascade
  // behavior (soft delete, restore, hard delete) fully owned by the service
  // layer rather than the database, matching this codebase's preference for
  // JSONB/plain-column escape hatches over heavier relational modeling.
  @AllowNull(true)
  @Column(DataType.STRING)
  parentId!: string | null;

  @AllowNull(false)
  @Column(DataType.STRING)
  label!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  value!: string;

  // Escape hatch for shape-specific extras (e.g. a legacy numeric advertiser
  // id kept for audit trail) — same role PreferenceQuestion.options plays
  // for its own variability.
  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata!: Record<string, unknown> | null;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  // Deactivate-only guard for load-bearing sentinel rows (e.g. the 'All'
  // entry in job_types/advertisers, the 'generic' working_rights fallback
  // parent) — admin can hide them but not delete them.
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isSystem!: boolean;

  // Scoped to (listKey, parentId). Ignored for listKey='advertisers', which
  // is always ordered alphabetically by label given its scale (~3,350 rows).
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

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt!: Date | null;
}
