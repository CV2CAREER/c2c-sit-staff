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

@Table({
  tableName: "messages",
  timestamps: true,
  paranoid: true, // Soft deletes (isDeleted functionality)
})
export class Message extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User, "userId")
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  body!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  read!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  archived!: boolean;

  @AllowNull(false)
  @Default("alert")
  @Column(DataType.ENUM("security", "alert"))
  class!: "security" | "alert";

  @AllowNull(true)
  @Column(DataType.JSONB)
  action?: {
    title?: string;
    url?: string;
  };

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @Column(DataType.DATE)
  deletedAt?: Date;
}