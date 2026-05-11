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
  tableName: "sales_consultants",
  timestamps: true,
})
export class SalesConsultant extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Unique // One sales consultant record per user
  @Column(DataType.STRING)
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
  @Default(false)
  @Column(DataType.BOOLEAN)
  isAccredited!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
