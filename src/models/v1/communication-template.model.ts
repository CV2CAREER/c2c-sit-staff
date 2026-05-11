import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  Index,
} from "sequelize-typescript";

@Table({
  tableName: "communication_templates",
  timestamps: true,
})
export class CommunicationTemplate extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  templateName!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  persona!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  subject!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  body!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

