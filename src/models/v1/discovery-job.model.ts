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
//~ import { DiscoverySourceRegister } from './discovery-source-register.model';

//~ @Table({
//~   tableName: 'discovery_jobs',
//~   timestamps: true,
//~   indexes: [
//~     { name: 'idx_discovery_job_source_id', fields: ['source_id'] },
//~     { name: 'idx_discovery_job_fingerprint', fields: ['fingerprint_hash'], unique: true },
//~     { name: 'idx_discovery_job_posted_date', fields: ['posted_date'] },
//~     { name: 'idx_discovery_job_source_job_id', fields: ['source_id', 'source_job_id'] },
//~   ],
//~ })
//~ export class DiscoveryJob extends Model {
//~   @PrimaryKey
//~   @Default(DataType.UUIDV4)
//~   @Column(DataType.STRING)
//~   id!: string;

//~   @ForeignKey(() => DiscoverySourceRegister)
//~   @AllowNull(false)
//~   @Column(DataType.STRING)
//~   source_id!: string;

//~   @BelongsTo(() => DiscoverySourceRegister)
//~   source?: DiscoverySourceRegister;

//~   @AllowNull(true)
//~   @Column(DataType.STRING)
//~   source_job_id?: string | null;

//~   @AllowNull(false)
//~   @Column(DataType.STRING(700))
//~   title!: string;

//~   @AllowNull(true)
//~   @Column(DataType.STRING(700))
//~   title_normalised?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING(700))
//~   company?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING(700))
//~   company_normalised?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING(700))
//~   location?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING(700))
//~   location_normalised?: string | null;

//~   @AllowNull(false)
//~   @Default(false)
//~   @Column(DataType.BOOLEAN)
//~   remote_flag!: boolean;

//~   @AllowNull(true)
//~   @Column(DataType.TEXT)
//~   description?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.DATE)
//~   posted_date?: Date | null;

//~   @AllowNull(true)
//~   @Column(DataType.DATE)
//~   expiry_date?: Date | null;

//~   @AllowNull(true)
//~   @Column(DataType.DECIMAL(12, 2))
//~   salary_min?: number | null;

//~   @AllowNull(true)
//~   @Column(DataType.DECIMAL(12, 2))
//~   salary_max?: number | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING(10))
//~   currency?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING)
//~   employment_type?: string | null;

//~   @AllowNull(false)
//~   @Column(DataType.TEXT)
//~   apply_url!: string;

//~   @AllowNull(true)
//~   @Column(DataType.TEXT)
//~   source_url?: string | null;

//~   @AllowNull(false)
//~   @Column(DataType.TEXT)
//~   fingerprint_hash!: string;

//~   @AllowNull(true)
//~   @Column(DataType.DATE)
//~   retrieved_at?: Date | null;

//~   @CreatedAt
//~   createdAt!: Date;

//~   @UpdatedAt
//~   updatedAt!: Date;
//~ }
