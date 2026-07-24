import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { User } from "./user.model";
import { Credentials } from "./credentials.model";
import { Plan } from "./plan.model";

/**
 * One row per paid campaign cycle on a client's credentials account.
 * A client's first payment creates the Credentials row plus their first
 * CredentialsTour. Every subsequent payment reuses the same Credentials row
 * and creates another CredentialsTour instead of duplicating credentials.
 */
@Table({
  tableName: "credentials_tours",
  timestamps: true,
  indexes: [
    {
      name: "idx_credentials_tour_credentials_id",
      fields: ["credentialsId"],
    },
    {
      name: "idx_credentials_tour_client_id",
      fields: ["clientId"],
    },
  ],
})
export class CredentialsTour extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Credentials)
  @AllowNull(false)
  @Column(DataType.STRING)
  credentialsId!: string;

  @BelongsTo(() => Credentials, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  credentials?: Credentials;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  clientId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  client?: User;

  // The actual plan record paid for, so the tour is traceable to payment
  // amount/status/paypal order on the plans table. plans.id is a legacy
  // varchar column (not a native uuid), even though the model types it as
  // DataType.UUID — the FK column here must match that real varchar type
  // or Postgres refuses to create the constraint.
  @ForeignKey(() => Plan)
  @AllowNull(true)
  @Column(DataType.STRING)
  planId!: string;

  @BelongsTo(() => Plan, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  plan?: Plan;

  // Snapshot of the plan title at the time this tour was created (e.g.
  // "Gold"), so the tour stays readable even if the plan record changes.
  @AllowNull(true)
  @Column(DataType.STRING(64))
  planTitle?: string;

  // Sequence number stamped from TourCount at creation time (1st, 2nd, ...).
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  tourNumber!: number;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  batch?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  craft?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  country?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  aliasEmail?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  startDate?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  expireAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  campaignEnd?: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  seekSubDurDays?: number;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  seekSubEndDate?: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
