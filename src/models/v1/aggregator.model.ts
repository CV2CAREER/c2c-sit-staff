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
import { AggregatorPicture } from "../../types/aggregator.types";

@Table({
  tableName: "aggregator_throttle_configs",
  timestamps: true,
})
export class Aggregator extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  config!: Record<string, any>;

  // Flexible picture object (previously Mixed)
  @AllowNull(false)
  @Column(DataType.JSONB)
  picture!: AggregatorPicture;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isEnabled!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedByUserId?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  userId?: string | null;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isStage!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

