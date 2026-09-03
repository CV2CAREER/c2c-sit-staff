import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "cec_issue_burndowns",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cec_ib_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cec_ib_created_at", fields: ["createdAt"] },
    { name: "idx_cec_ib_name", fields: ["name"] },
  ],
})
export class CECIssueBurndown extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @Index
  name!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  otp?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  verification?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  cv?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  forwarding?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  indeed?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  delegation?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  outreachType?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  outreachDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  resolution?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  login?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  proof?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  vcount?: string;

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
