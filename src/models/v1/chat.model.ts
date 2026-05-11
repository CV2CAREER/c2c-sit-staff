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
  tableName: "chats",
  timestamps: true,
  paranoid: true, // Soft deletes
})
export class Chat extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  sessionId!: string;

  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  messages!: Array<{
    role: "user" | "assistant" | "system";
    message: string;
    content?: string;
  }>;

  @AllowNull(true)
  @Column(DataType.STRING)
  jobUrl?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  jobContent?: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  clientId?: string;

  @BelongsTo(() => User, "clientId")
  client?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @Column(DataType.DATE)
  deletedAt?: Date;
}