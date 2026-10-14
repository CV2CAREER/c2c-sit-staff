import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "cec_referral_payouts",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cec_rp_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cec_rp_created_at", fields: ["createdAt"] },
    { name: "idx_cec_rp_outreach", fields: ["outreach"] },
    { name: "idx_cec_rp_response", fields: ["response"] },
  ],
})
export class CECReferralPayout extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  customerId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  date?: string;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  amount?: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  account?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  type?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  details?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  heritage?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  gender?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  outreach?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  response?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  processed?: string;

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

  @BelongsTo(() => User, { foreignKey: "createdBy", onDelete: "SET NULL" })
  creator?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
