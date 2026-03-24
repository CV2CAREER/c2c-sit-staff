import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { Plan } from "./plan.model";
import { User } from "./user.model";

@Table({
  tableName: "subscription_allocations",
  timestamps: true,
  paranoid: true,
})
export class SubscriptionAllocation extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => Plan)
  @AllowNull(false)
  @Column(DataType.STRING)
  planId!: string;

  @BelongsTo(() => Plan, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  plan!: Plan;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  staffUserId!: string;

  @BelongsTo(() => User, "staffUserId")
  staffUser!: User;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  assignedByUserId?: string;

  @BelongsTo(() => User, "assignedByUserId")
  assignedByUser?: User;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  assignedAt!: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  endedAt?: Date;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @Column(DataType.DATE)
  deletedAt?: Date;
}

