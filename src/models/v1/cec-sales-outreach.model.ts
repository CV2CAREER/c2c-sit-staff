import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "cec_sales_outreach",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cec_so_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cec_so_created_at", fields: ["createdAt"] },
    { name: "idx_cec_so_persona", fields: ["persona"] },
    { name: "idx_cec_so_state", fields: ["state"] },
  ],
})
export class CECSalesOutreach extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  persona?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  state?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  sentiment?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  heritage?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  available?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reached?: string;

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
