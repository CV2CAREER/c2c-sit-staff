//~ import {
//~   Table,
//~   Column,
//~   Model,
//~   DataType,
//~   PrimaryKey,
//~   Default,
//~   AllowNull,
//~   CreatedAt,
//~   UpdatedAt,
//~ } from 'sequelize-typescript';

//~ @Table({
//~   tableName: 'discovery_source_register',
//~   timestamps: true,
//~   indexes: [
//~     { name: 'idx_discovery_source_slug', fields: ['slug'], unique: true },
//~     { name: 'idx_discovery_source_enabled', fields: ['enabled'] },
//~   ],
//~ })
//~ export class DiscoverySourceRegister extends Model {
//~   @PrimaryKey
//~   @Default(DataType.UUIDV4)
//~   @Column(DataType.STRING)
//~   id!: string;

//~   @AllowNull(false)
//~   @Column(DataType.STRING)
//~   name!: string;

//~   @AllowNull(false)
//~   @Column(DataType.STRING)
//~   slug!: string;

//~   @AllowNull(false)
//~   @Default('email')
//~   @Column(DataType.STRING)
//~   route!: string; // 'api' | 'email' | 'page'

//~   @AllowNull(true)
//~   @Default('Permitted')
//~   @Column(DataType.STRING)
//~   permission_outcome?: string; // 'Permitted' | 'Deferred' | 'Excluded'

//~   @AllowNull(true)
//~   @Column(DataType.TEXT)
//~   evidence?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING)
//~   api_key?: string | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING)
//~   app_id?: string | null;

//~   @AllowNull(true)
//~   @Default(360)
//~   @Column(DataType.INTEGER)
//~   cadence_minutes?: number;

//~   @AllowNull(false)
//~   @Default(false)
//~   @Column(DataType.BOOLEAN)
//~   enabled!: boolean;

//~   @AllowNull(true)
//~   @Column(DataType.DATE)
//~   last_fetched_at?: Date | null;

//~   @AllowNull(true)
//~   @Column(DataType.JSONB)
//~   config?: Record<string, any> | null;

//~   @AllowNull(true)
//~   @Default(0)
//~   @Column(DataType.INTEGER)
//~   consecutive_zero_runs?: number;

//~   @AllowNull(true)
//~   @Column(DataType.DATE)
//~   auto_paused_at?: Date | null;

//~   @AllowNull(true)
//~   @Column(DataType.STRING)
//~   last_permission_error?: string | null;

//~   @CreatedAt
//~   createdAt!: Date;

//~   @UpdatedAt
//~   updatedAt!: Date;
//~ }
