//~ import {
//~   Table,
//~   Column,
//~   Model,
//~   DataType,
//~   PrimaryKey,
//~   Default,
//~   AllowNull,
//~   ForeignKey,
//~   BelongsTo,
//~   CreatedAt,
//~   UpdatedAt,
//~ } from 'sequelize-typescript';
//~ import { DiscoveryJob } from './discovery-job.model';

//~ @Table({
//~   tableName: 'discovery_matches',
//~   timestamps: true,
//~   indexes: [
//~     { name: 'idx_discovery_match_job_id', fields: ['job_id'] },
//~     { name: 'idx_discovery_match_client_id', fields: ['client_id'] },
//~     { name: 'idx_discovery_match_status', fields: ['status'] },
//~     { name: 'idx_discovery_match_job_client', fields: ['job_id', 'client_id'], unique: true },
//~   ],
//~ })
//~ export class DiscoveryMatch extends Model {
//~   @PrimaryKey
//~   @Default(DataType.UUIDV4)
//~   @Column(DataType.STRING)
//~   id!: string;

//~   @ForeignKey(() => DiscoveryJob)
//~   @AllowNull(false)
//~   @Column(DataType.STRING)
//~   job_id!: string;

//~   @BelongsTo(() => DiscoveryJob)
//~   job?: DiscoveryJob;

//~   @AllowNull(false)
//~   @Column(DataType.STRING)
//~   client_id!: string;

//~   @AllowNull(true)
//~   @Column(DataType.DECIMAL(5, 2))
//~   match_score?: number | null;

//~   @AllowNull(true)
//~   @Column(DataType.TEXT)
//~   match_rationale?: string | null;

//~   @AllowNull(false)
//~   @Default('machine')
//~   @Column(DataType.STRING)
//~   discovery_method!: string; // 'machine' | 'staff'

//~   @AllowNull(false)
//~   @Default('UNATTENDED')
//~   @Column(DataType.STRING)
//~   status!: string; // reuses pipeline statuses

//~   @AllowNull(true)
//~   @Column(DataType.STRING)
//~   vetting_outcome?: string | null;

//~   @CreatedAt
//~   createdAt!: Date;

//~   @UpdatedAt
//~   updatedAt!: Date;
//~ }
