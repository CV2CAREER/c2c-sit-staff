import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  Default,
} from "sequelize-typescript";
import { User } from "./user.model";
import { Resource } from "./resources.model";
import { Ability } from "../../utils/enum";

@Table({
  tableName: "user_permissions",
  timestamps: true,
})
export class UserPermission extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => Resource) // Assuming Resource model exists
  @AllowNull(false)
  @Column(DataType.STRING)
  resourceId!: string;

  @BelongsTo(() => Resource)
  resource!: Resource;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  abilities!: Ability[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
