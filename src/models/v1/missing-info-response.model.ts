import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
} from "sequelize-typescript";

@Table({
  tableName: "missing_info_responses",
  timestamps: false,
})
export class MissingInfoResponse extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  requestId!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  fieldId!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  fieldName!: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  fieldLabel!: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  fieldValue!: string | null;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;
}
