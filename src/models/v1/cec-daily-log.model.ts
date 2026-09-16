import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "cec_daily_logs",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cec_dl_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cec_dl_created_at", fields: ["createdAt"] },
    { name: "idx_cec_dl_name", fields: ["name"] },
    { name: "idx_cec_dl_status", fields: ["status"] },
    { name: "idx_cec_dl_loyalty", fields: ["loyalty"] },
    { name: "idx_cec_dl_sentiment_before", fields: ["sentimentBefore"] },
  ],
})
export class CECDailyLog extends Model {
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
  @Index
  @Column(DataType.STRING)
  campaignCredentialId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  mobile?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  status?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  loyalty?: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  submissions?: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  lastCall?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  callEstablished?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  sentimentBefore?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  sentimentAfter?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  migration?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  survey?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  referral?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  blockerFixed?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  postCall?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  subDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  subEnd?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reviewDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  qqa?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  cvFidelity?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  prefs?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  historyReviewed?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  briefing?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  followUp?: string;

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
