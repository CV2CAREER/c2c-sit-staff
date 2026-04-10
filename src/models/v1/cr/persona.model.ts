import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, AllowNull, Index } from "sequelize-typescript";

@Table({ tableName: "cr_personas", timestamps: true })
export class CRPersona extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  @Index
  label!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}