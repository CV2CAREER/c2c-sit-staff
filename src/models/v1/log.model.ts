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
  Index
} from "sequelize-typescript";

@Table({
  tableName: "logs",
  timestamps: true,
  indexes: [
    { name: "idx_logs_type", fields: ["type"] },
    { name: "idx_logs_createdAt", fields: ["createdAt"] }
  ]
})
export class Log extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(100))
  origin!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  title!: string;

  @AllowNull(false)
  @Index
  @Column(DataType.ENUM(
    'bot_log',
    'ai_log',
    'cv_ai_log',
    'reed_logs',
    'jora_log',
    'aq_ai_log',
    'cv_auto_accept_reject_log',
    'keyword_log',
    'interview_prep_log',
    'regression_bot_log',
    'digital-traceability-logs',
    'adzuna-logs',
    'seek-logs',
    'careerone-logs'
  ))
  type!: string;

  @Column(DataType.TEXT)
  summary?: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}