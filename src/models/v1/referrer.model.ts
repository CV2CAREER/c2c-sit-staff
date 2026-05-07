import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  Unique,
} from "sequelize-typescript";
import { User } from "./user.model";
import { ReferrerStatus, RevenueStatus } from "../../utils/enum";

@Table({
  tableName: "referrers",
  timestamps: true,
})
export class Referrer extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.UUID)
  id!: string;

  // Foreign key to users table (one-to-many )
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE", // Delete referrer record if user is deleted
    onUpdate: "CASCADE",
  })
  user!: User;

  // The referrer identifier (e.g., referral code, email, or user ID of the referrer)
  @AllowNull(true)
  @Column(DataType.STRING)
  referrer?: string;

  @AllowNull(false)
  @Default(ReferrerStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(ReferrerStatus)))
  status!: ReferrerStatus;

  @AllowNull
  @Default(RevenueStatus.UNPAID)
  @Column(DataType.ENUM(...Object.values(RevenueStatus)))
  referralStatus!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}