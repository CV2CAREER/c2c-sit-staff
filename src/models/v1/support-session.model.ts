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
  Index,
} from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "support_sessions",
  timestamps: true,
  paranoid: true,
})
export class SupportSession extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  customerId?: string;

  @BelongsTo(() => User, "customerId")
  customer?: User;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  assignedStaffId?: string;

  @BelongsTo(() => User, "assignedStaffId")
  assignedStaff?: User;

  @AllowNull(true)
  @Column(DataType.STRING)
  subject?: string;

  @Default("open")
  @Column(DataType.ENUM("open", "active", "closed", "resolved"))
  status!: "open" | "active" | "closed" | "resolved";

  @AllowNull(true)
  @Column(DataType.ENUM("satisfied", "not_satisfied", "neutral"))
  feedback?: "satisfied" | "not_satisfied" | "neutral";

  @AllowNull(true)
  @Column(DataType.TEXT)
  feedbackComment?: string;

  @Column(DataType.DATE)
  startedAt?: Date;

  @Column(DataType.DATE)
  closedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @Column(DataType.DATE)
  deletedAt?: Date;
}