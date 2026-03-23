import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({
  tableName: "blacklistedTokens",
  timestamps: true,
  indexes: [],
})
export default class BlacklistedToken extends Model {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
    allowNull: false,
  })
  id!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  token!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expiresAt!: Date;
}
