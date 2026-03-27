import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./user.model";
import { DayOfWeek } from "../../utils/enum";

// Time slot interface
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  hasExpired: boolean;
}

@Table({
  tableName: "schedules",
  timestamps: true,
  paranoid: true,
})
export class Schedule extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  timezone?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  date?: Date;

  @AllowNull(true)
  @Column(DataType.ENUM("sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"))
  day?: DayOfWeek;

  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  time!: TimeSlot[];

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isAvailable!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  // Coach reference - only coaches can have schedules
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  coachId!: string;

  @BelongsTo(() => User, "coachId")
  coach!: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}