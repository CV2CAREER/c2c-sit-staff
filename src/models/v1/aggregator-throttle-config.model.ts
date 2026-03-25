import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  tableName: "aggregator_throttle_configs",
  timestamps: true,
})
export class AggregatorThrottleConfig extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  config!: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.UUID)
  updatedByUserId?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

