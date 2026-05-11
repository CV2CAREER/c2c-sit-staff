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
  AllowNull,
  Index
} from "sequelize-typescript";
import { User } from "./user.model";
import { CRTracking } from "./cr-tracking.model";

@Table({
  tableName: "cr_tracking_history",
  timestamps: false,
  indexes: [
    { name: "idx_cr_history_cr_id", fields: ["crId"] },
    { name: "idx_cr_history_created_at", fields: ["createdAt"] }
  ]
})
export class CRTrackingHistory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => CRTracking)
  @AllowNull(true)
  @Column(DataType.STRING)
  @Index
  crId?: string;

  @BelongsTo(() => CRTracking, "crId")
  crTracking?: CRTracking;

  @AllowNull(true)
  @Column(DataType.STRING)
  @Index
  userId?: string;

  @Column(DataType.STRING)
  action!: string;

  @Column(DataType.JSON)
  changes?: any;

  @Column(DataType.JSON)
  previousState?: any;

  @Column(DataType.JSON)
  newState?: any;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  performedBy?: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  nilNotifiedBy?: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  nilUpdatedBy?: string;

  @CreatedAt
  @Column(DataType.DATE)
  @Index
  createdAt!: Date;

  @BelongsTo(() => User, "performedBy")
  performer?: User;
}
