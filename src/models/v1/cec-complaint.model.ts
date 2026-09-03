import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "cec_complaints",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cec_cc_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cec_cc_created_at", fields: ["createdAt"] },
    { name: "idx_cec_cc_name", fields: ["name"] },
    { name: "idx_cec_cc_category", fields: ["category"] },
    { name: "idx_cec_cc_priority", fields: ["priority"] },
    { name: "idx_cec_cc_status", fields: ["status"] },
    { name: "idx_cec_cc_owner", fields: ["owner"] },
  ],
})
export class CECComplaint extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  complaintId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  logged?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @Index
  name!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  category?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  channel?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  priority?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  status?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  owner?: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  age?: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  issue?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  action?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  next?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  resolved?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  @Index
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  deletedAt?: Date;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  createdBy?: string;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  updatedBy?: string;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  deletedBy?: string;

  @BelongsTo(() => User, "createdBy")
  creator?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
