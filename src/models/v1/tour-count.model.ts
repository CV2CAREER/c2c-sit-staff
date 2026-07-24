import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { Credentials } from "./credentials.model";

/**
 * Running total of how many CredentialsTour rows have been issued for a
 * given credentials account. One row per credentialsId, incremented
 * atomically each time a new tour is created (first payment or a renewal).
 */
@Table({
  tableName: "tour_counts",
  timestamps: true,
})
export class TourCount extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Unique
  @ForeignKey(() => Credentials)
  @AllowNull(false)
  @Column(DataType.STRING)
  credentialsId!: string;

  @BelongsTo(() => Credentials, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  credentials?: Credentials;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  count!: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
