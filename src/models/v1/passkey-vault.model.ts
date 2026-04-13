import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";

@Table({
  tableName: "passkey_vault",
  timestamps: true,
  indexes: [
    {
      fields: ["name"],
      unique: true,
    },
  ],
})
export class PassKeyVault extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  key!: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  createdBy?: string;

  @AllowNull(true)
  @Column(DataType.UUID)
  updateBy?: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}

export default PassKeyVault;