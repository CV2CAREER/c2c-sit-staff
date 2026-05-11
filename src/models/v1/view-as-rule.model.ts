import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  Index,
  Unique
} from "sequelize-typescript";

@Table({
  tableName: "view_as_rules",
  timestamps: true,
  indexes: [
    { name: "idx_view_as_rules_persona", fields: ["persona"], unique: true }
  ]
})
export class ViewAsRule extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @Unique
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(100))
  persona!: string;

  @AllowNull(false)
  @Column(DataType.JSON)
  allowedTargets!: string[];

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}