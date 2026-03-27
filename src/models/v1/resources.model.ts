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
  @Column(DataType.UUID)
  id!: string;

  // Add resource fields here
}
