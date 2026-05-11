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
  Unique,
} from "sequelize-typescript";

@Table({
  tableName: "system_configs",
  timestamps: true,
})
export class SystemConfig extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  key!: string;

  @AllowNull(false)
  @Default({})
  @Column(DataType.JSONB)
  value!: Record<string, any>;

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedByUserId?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

