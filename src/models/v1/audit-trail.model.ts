import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  Index,
} from "sequelize-typescript";

@Table({
  tableName: "audit_trails",
  timestamps: false,
})
export class AuditTrail extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  action!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  actorUserId!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  actorEmail?: string | null;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  targetType!: string;

  @AllowNull(true)
  @Index
  @Column(DataType.STRING)
  targetKey?: string | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  before?: any;

  @AllowNull(true)
  @Column(DataType.JSONB)
  after?: any;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: any;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;
}

