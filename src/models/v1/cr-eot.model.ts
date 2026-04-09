import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Index,
  ForeignKey
} from "sequelize-typescript";
import { CRTracking } from "./cr-tracking.model";
import { CROwner } from "./cr/owner.model";

@Table({ tableName: "cr_eot_requests", timestamps: true })
export class CREOT extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => CRTracking)
  @AllowNull(false)
  @Column(DataType.UUID)
  @Index
  crId!: string;

  @ForeignKey(() => CROwner)
  @AllowNull(false)
  @Column(DataType.UUID)
  @Index
  developerId!: string;

  @ForeignKey(() => CROwner)
  @AllowNull(false)
  @Column(DataType.UUID)
  @Index
  nilId!: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  numberOfHours!: number;

  @AllowNull(false)
  @Column(DataType.DATE)
  durationStart!: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  durationEnd!: Date;

  @AllowNull(true)
  @Column(DataType.TEXT)
  note?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}