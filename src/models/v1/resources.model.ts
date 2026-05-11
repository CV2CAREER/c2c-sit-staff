import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
} from "sequelize-typescript";

@Table({ tableName: "resources", timestamps: true })
export class Resource extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.STRING)
  id!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  value!: string;
}
