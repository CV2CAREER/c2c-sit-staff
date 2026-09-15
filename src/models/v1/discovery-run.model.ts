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
} from 'sequelize-typescript';

@Table({
  tableName: 'discovery_runs',
  timestamps: true,
  indexes: [
    { name: 'idx_discovery_run_status', fields: ['status'] },
    { name: 'idx_discovery_run_started_at', fields: ['started_at'] },
    { name: 'idx_discovery_run_run_id', unique: true, fields: ['run_id'] },
  ],
})
export class DiscoveryRun extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  run_id!: string; // e.g. 'RUN-0828-03'

  @AllowNull(false)
  @Default('scheduled')
  @Column(DataType.STRING)
  trigger!: string; // 'scheduled' | 'manual'

  @AllowNull(false)
  @Default('running')
  @Column(DataType.STRING)
  status!: string; // 'running' | 'success' | 'failed' | 'killed'

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  started_at!: Date;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  duration_ms?: number | null;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  clients_count?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  fetched_count?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  dedup_count?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  hqa_count?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  mqa_count?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  lqa_count?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  tokens_used?: number;

  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  ai_request_count?: number;

  @AllowNull(true)
  @Column(DataType.JSONB)
  log_entries?: Record<string, any>[] | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  error_message?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
