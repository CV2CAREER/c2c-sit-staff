import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Index
} from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "sales_operations",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_sales_op_is_deleted", fields: ["isDeleted"] },
    { name: "idx_sales_op_created_at", fields: ["createdAt"] },
    { name: "idx_sales_op_executive", fields: ["salesExecutive"] },
    { name: "idx_sales_op_territory", fields: ["australiaTerritory"] }
  ]
})
export class SalesOperation extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @Index
  salesExecutive!: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  commsDispatchDate?: Date;

  @AllowNull(false)
  @Column(DataType.STRING)
  @Index
  australiaTerritory!: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  entryCreationDate?: Date;

  @AllowNull(false)
  @Column(DataType.STRING)
  partnerType!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  webPage?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  secondaryContactFullName?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastContactDate?: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  followUpCallStatus?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  secondaryPhoneNumber?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  primaryContactEmail!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  secondaryContactEmail?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  adoptionStatus!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  verifiedEmail?: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  linkedinPage?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  entryReviewStatus?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  @Index
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.DATE)
  deletedAt?: Date;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdBy?: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  updatedBy?: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  deletedBy?: string;

  @BelongsTo(() => User, "createdBy")
  creator?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}