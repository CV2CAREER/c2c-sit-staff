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
  HasOne,
} from "sequelize-typescript";
import { User } from "./user.model";

@Table({
  tableName: "locations",
  timestamps: true,
})
export class Location extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  currencyCode?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  multiplier?: string;

  // Note: Features reference locations via locationIds array
  // PostgreSQL doesn't support FK constraints on ARRAY columns
  // So we don't define a HasMany relationship here

  @HasOne(() => User, "locationId")
  user?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
