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
  Index,
} from "sequelize-typescript";
import { User } from "./user.model";
import { Profile } from "./profile.model";

@Table({
  tableName: "user_preference_history",
  timestamps: false,
  indexes: [
    {
      name: "idx_history_user_id",
      fields: ["userId"],
    },
    {
      name: "idx_history_profile_id",
      fields: ["profileId"],
    },
    {
      name: "idx_history_created_at",
      fields: ["createdAt"],
    },
  ],
})
export class UserPreferenceHistory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user!: User;

  @ForeignKey(() => Profile)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  profileId!: string;

  @BelongsTo(() => Profile, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  profile!: Profile;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM('primary', 'secondary'),
  })
  profileType!: 'primary' | 'secondary';

  @AllowNull(true)
  @Column(DataType.ARRAY(DataType.STRING))
  updatedFields!: string[];

  @AllowNull(true)
  @Column(DataType.STRING)
  updateSource!: string;

  // Full preference snapshot as JSON
  @AllowNull(false)
  @Column(DataType.JSONB)
  preferenceSnapshot!: Record<string, any>;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;
}