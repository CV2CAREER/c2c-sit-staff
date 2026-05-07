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
import { SupportSession } from "./support-session.model";
import { User } from "./user.model";

@Table({
  tableName: "support_conversations",
  timestamps: true,
  indexes: [
    { name: "idx_support_conversations_session", fields: ["supportSessionId"] },
    { name: "idx_support_conversations_sender", fields: ["senderId"] }
  ]
})
export class SupportConversation extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => SupportSession)
  @AllowNull(false)
  @Column(DataType.UUID)
  supportSessionId!: string;

  @BelongsTo(() => SupportSession, "supportSessionId")
  supportSession!: SupportSession;

  @AllowNull(false)
  @Column(DataType.ENUM("customer", "staff", "system"))
  senderType!: "customer" | "staff" | "system";

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  senderId?: string;

  @BelongsTo(() => User, "senderId")
  sender?: User;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message!: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, any>;

  @Default(false)
  @Column(DataType.BOOLEAN)
  read!: boolean;

  @AllowNull(true)
  @Column(DataType.ENUM("satisfied", "not_satisfied", "neutral"))
  feedback?: "satisfied" | "not_satisfied" | "neutral";

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}