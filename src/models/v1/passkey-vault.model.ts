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
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  key!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  createdBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  updateBy?: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}

export default PassKeyVault;