import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  Unique,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

export enum JCTriggerStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Table({
  tableName: "jc_triggers",
  timestamps: true,
})
export class JCTrigger extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  trigger!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  template!: string;

  @AllowNull(false)
  @Default(JCTriggerStatus.ACTIVE)
  @Column(DataType.ENUM(...Object.values(JCTriggerStatus)))
  status!: JCTriggerStatus;

  @AllowNull(false)
  @Column(DataType.STRING)
  updatedBy!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
