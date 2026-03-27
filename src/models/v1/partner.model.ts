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

@Table({
  tableName: "partners",
  timestamps: true,
})
export class Partner extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Unique // One partner record per user
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user!: User;

  @AllowNull(false)
  @Unique // Referral codes must be unique
  @Column(DataType.STRING)
  referralCode!: string;

  @AllowNull(false)
  @Default(2)
  @Column(DataType.INTEGER)
  maxAllowed!: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isAccredited!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  promotionalCount!: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  numberOfFreePromoCount!: number;

  @AllowNull(false)
  @Default(5)
  @Column(DataType.INTEGER)
  numberOfReferralsBeforePromo!: number;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  numberOfFreePromo!: number;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  allowFreeBeforeReferal!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
