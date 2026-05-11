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
import { AccessLevel } from "./access-level.model";

@Table({
  tableName: "access_rules",
  timestamps: true,
})
export class AccessRule extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => AccessLevel)
  @AllowNull(false)
  @Column(DataType.STRING)
  accessLevelId!: string;

  @BelongsTo(() => AccessLevel, "accessLevelId")
  accessLevel?: AccessLevel;

  @AllowNull(false)
  @Column(DataType.STRING)
  description!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  path!: string;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  access!: string[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

