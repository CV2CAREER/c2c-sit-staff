import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { AccessRule } from "./access-rule.model";
import { UserAccessLevel } from "./user-access-level.model";

@Table({
  tableName: "access_levels",
  timestamps: true,
})
export class AccessLevel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description?: string;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  personas!: string[];

  @HasMany(() => AccessRule, "accessLevelId")
  rules?: AccessRule[];

  @HasMany(() => UserAccessLevel, "accessLevelId")
  userAccessLevels?: UserAccessLevel[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

