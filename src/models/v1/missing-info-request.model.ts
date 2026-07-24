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
import { MissingInfoType } from "../../types/missingInfoConfig";

@Table({
  tableName: "missing_info_requests",
  timestamps: true,
})
export class MissingInfoRequest extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  targetUserId!: string;

  @BelongsTo(() => User, {
    foreignKey: "targetUserId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  targetUser!: User;

  // Staff user ID — lives in a separate staff database, stored as plain string
  @AllowNull(false)
  @Column(DataType.STRING)
  requestedById!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  missingInfoType!: MissingInfoType;

  @AllowNull(false)
  @Column(DataType.TEXT)
  missingInfoUrl!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  jobURL!: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  requestedAt!: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
