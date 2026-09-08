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
} from 'sequelize-typescript';

@Table({
  tableName: 'discovery_schedule',
  timestamps: true,
})
export class DiscoverySchedule extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  enabled!: boolean;

  @AllowNull(false)
  @Default(360)
  @Column(DataType.INTEGER)
  cadence_minutes!: number;

  @AllowNull(true)
  @Column(DataType.DATE)
  next_run_at!: Date | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  last_run_at!: Date | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
