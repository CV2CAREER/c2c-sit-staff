import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "audit_logs",
  timestamps: true,
  indexes: [
    {
      fields: ["createdAt"],
    },
    {
      fields: ["userId"],
    },
    {
      fields: ["method"],
    },
  ],
})
export class AuditLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  userFullName?: string;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  userRole?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  deviceUsed?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  description?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  url?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  dataEntry?: any;

  @AllowNull(false)
  @Column(DataType.STRING)
  method?: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}

export default AuditLog;