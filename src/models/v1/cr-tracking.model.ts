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
import { CROwner } from "./cr/owner.model";

@Table({
  tableName: "cr_tracking",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_cr_tracking_is_deleted", fields: ["isDeleted"] },
    { name: "idx_cr_tracking_level", fields: ["level"] },
    { name: "idx_cr_tracking_created_at", fields: ["createdAt"] },
    { name: "idx_cr_tracking_status", fields: ["status"] },
    { name: "idx_cr_tracking_owner", fields: ["owner"] },
    { name: "idx_cr_tracking_nil", fields: ["NIL"] }
  ]
})
export class CRTracking extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description?: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  createdBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  crType?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  stage?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  startDate?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  endDate?: Date;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  durationInHours?: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  changeType?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  duration?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  prevState?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  currentState?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  futureState?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  context?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  businessImpact?: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  updatedBy?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  note?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  meetAfterCompletion?: boolean;

  @AllowNull(true)
  @Column(DataType.JSON)
  currentStateImageURLs?: string[];

  @AllowNull(true)
  @Column(DataType.JSON)
  futureStateImageURLs?: string[];

  @AllowNull(true)
  @Column(DataType.STRING)
  severity?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  family?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  system?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  status?: string;

  @AllowNull(true)
  @Column(DataType.JSON)
  impactedPersona?: string[];

  @AllowNull(true)
  @Column(DataType.JSON)
  impactedProvider?: string[];

  @AllowNull(true)
  @Column(DataType.JSON)
  impactedNode?: string[];

  @Default(false)
  @Column(DataType.BOOLEAN)
  isNILNotified?: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  @Index
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.JSON)
  noteTrail?: Array<{
    note?: string;
    addedBy?: string;
    addedAt: Date;
  }>;

  @AllowNull(true)
  @Default(1)
  @Column(DataType.INTEGER)
  @Index
  level?: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  changeRequestId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  priority?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  deletedAt?: Date;
  

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  deletedBy?: string;

  @ForeignKey(() => CROwner)
  @AllowNull(true)
  @Column(DataType.UUID)
  @Index
  ownerId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  ownerEmail?: string;

  @ForeignKey(() => CROwner)
  @AllowNull(true)
  @Column(DataType.UUID)
  @Index
  nilId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  nilEmail?: string;

  @ForeignKey(() => CROwner)
  @AllowNull(true)
  @Column(DataType.UUID)
  @Index
  nominatedDeveloperId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  nominatedDeveloperEmail?: string;

  @BelongsTo(() => User, "createdBy")
  creator?: User;

  @BelongsTo(() => CROwner, "ownerId")
  owner?: CROwner;

  @BelongsTo(() => CROwner, "nilId")
  nil?: CROwner;

  @BelongsTo(() => CROwner, "nominatedDeveloperId")
  nominatedDeveloper?: CROwner;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}