import {
  AllowNull,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({
  tableName: "training_tracker_sessions",
  timestamps: true,
})
export class TrainingTrackerSession extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  sessionNumber!: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  name?: string;
}
