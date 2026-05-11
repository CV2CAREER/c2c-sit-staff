import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
} from "sequelize-typescript";

@Table({
  tableName: "otpTokens",
  timestamps: true, // createdAt and updatedAt
  indexes: [
    // 🔹 Single-column index
    {
      fields: ["otp"],
    },
  ],
})
export default class OTPToken extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.STRING)
  id!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  otp!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  type!: string;

  @Column({ type: DataType.STRING, allowNull: true })
  userId!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  revoked!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expiresAt!: Date;
}
