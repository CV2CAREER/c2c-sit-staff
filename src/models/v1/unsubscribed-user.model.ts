import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./user.model";

@Table({ tableName: "unsubscribedusers", timestamps: true })
export class UnsubscribedUser extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  userId!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  date!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  time!: string;
}