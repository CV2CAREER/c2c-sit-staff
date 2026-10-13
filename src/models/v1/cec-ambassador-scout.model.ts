import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, Index } from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "cec_ambassador_scouts",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cec_as_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cec_as_created_at", fields: ["createdAt"] },
    { name: "idx_cec_as_country", fields: ["country"] },
  ],
})
export class CECAmbassadorScout extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  country?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  pipeline?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  nominations?: string;

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
