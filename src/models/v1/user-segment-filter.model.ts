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
import { User } from "./user.model";

/**
 * A staff member's saved combination of the Users page's sidebar facets
 * (persona/state/group/loyalty) for one-click reapplication later — the
 * "Saved segments" list. Personal to the user who created it; there's no
 * sharing/team-wide segment concept yet.
 */
@Table({
  tableName: "user_segment_filters",
  timestamps: true,
  indexes: [{ name: "idx_user_segment_filters_user_id", fields: ["userId"] }],
})
export class UserSegmentFilter extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  name!: string;

  // Shape mirrors the frontend's UserFilterState ({persona, state, group,
  // loyalty}, each string | null) — stored opaquely since only the Users
  // page's sidebar reads it back.
  @AllowNull(false)
  @Column(DataType.JSONB)
  filters!: Record<string, string | null>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
