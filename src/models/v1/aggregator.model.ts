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
  @Column(DataType.UUID)
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
  @Column(DataType.UUID)
  updatedByUserId?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

