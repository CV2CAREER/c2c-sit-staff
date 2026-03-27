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
  tableName: "customer_services",
  timestamps: true,
})
export class CustomerService extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Unique // One customer service record per user
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user!: User;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isAccredited!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
