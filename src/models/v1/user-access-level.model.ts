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
  Index,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { User } from "./user.model";
import { AccessLevel } from "./access-level.model";

@Table({
  tableName: "user_access_levels",
  timestamps: true,
})
export class UserAccessLevel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index("idx_user_access_levels_user_access_unique")
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, "userId")
  user?: User;

  @ForeignKey(() => AccessLevel)
  @AllowNull(false)
  @Index("idx_user_access_levels_user_access_unique")
  @Column(DataType.UUID)
  accessLevelId!: string;

  @BelongsTo(() => AccessLevel, "accessLevelId")
  accessLevel?: AccessLevel;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

