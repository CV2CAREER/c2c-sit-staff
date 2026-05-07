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
import { DayOfWeek, ClientSessionType } from "../../utils/enum";

@Table({
  tableName: "client_availabilities",
  timestamps: true,
  paranoid: true,
})
export class ClientAvailability extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.ENUM("sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"))
  day!: DayOfWeek;

  @AllowNull(false)
  @Column(DataType.STRING)
  timezone!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  startTime!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  endTime!: string;

  @AllowNull(false)
  @Column(DataType.ENUM("screening_preparation", "interview_panel", "career_consultation"))
  sessionType!: ClientSessionType;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isAvailable!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  // Client reference
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  clientId!: string;

  @BelongsTo(() => User, "clientId")
  client!: User;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}