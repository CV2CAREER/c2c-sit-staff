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
} from "sequelize-typescript";

/**
 * ApplicationSummary Model
 * 
 * This model stores pre-calculated counts for applications to avoid
 * expensive COUNT queries on millions of records.
 * 
 * Uses a single-row pattern with id=1 for global statistics.
 * Can also be used for daily/hourly statistics by using different summaryType values.
 */
@Table({
  tableName: "application_summaries",
  timestamps: true,
})
export class ApplicationSummary extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  // Type of summary: 'global', 'daily', 'hourly', 'by_client', etc.
  @Default("global")
  @Column(DataType.STRING(50))
  summaryType!: string;

  // Optional reference key (e.g., date for daily summaries, clientId for client-specific)
  @AllowNull(true)
  @Column(DataType.STRING(100))
  referenceKey?: string;

  // Total count of all applications
  @Default(0)
  @Column(DataType.BIGINT)
  totalApplications!: number;

  // Count of successful applications
  @Default(0)
  @Column(DataType.BIGINT)
  successCount!: number;

  // Count of failed applications
  @Default(0)
  @Column(DataType.BIGINT)
  failedCount!: number;

  // Count of pending applications
  @Default(0)
  @Column(DataType.BIGINT)
  pendingCount!: number;

  // Count by application source (stored as JSONB)
  @AllowNull(true)
  @Default({})
  @Column(DataType.JSONB)
  countBySource?: Record<string, number>;

  // Count by application mode (stored as JSONB)
  @AllowNull(true)
  @Default({})
  @Column(DataType.JSONB)
  countByMode?: Record<string, number>;

  // Count by country (stored as JSONB)
  @AllowNull(true)
  @Default({})
  @Column(DataType.JSONB)
  countByCountry?: Record<string, number>;

  // Count by status (stored as JSONB)
  @AllowNull(true)
  @Default({})
  @Column(DataType.JSONB)
  countByStatus?: Record<string, number>;

  // Count by bot responsible (stored as JSONB)
  @AllowNull(true)
  @Default({})
  @Column(DataType.JSONB)
  countByBot?: Record<string, number>;

  // Client-specific counts (if summaryType is 'by_client')
  @AllowNull(true)
  @Column(DataType.STRING)
  clientId?: string;

  // Last time the summary was recalculated
  @AllowNull(true)
  @Column(DataType.DATE)
  lastCalculatedAt?: Date;

  // Version for optimistic locking during updates
  @Default(1)
  @Column(DataType.INTEGER)
  version!: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Instance method to increment counts atomically
  static async incrementCounts(
    summaryType: string = "global",
    referenceKey?: string,
    fields: {
      totalApplications?: number;
      successCount?: number;
      failedCount?: number;
      pendingCount?: number;
    } = {}
  ): Promise<void> {
    const whereClause: any = { summaryType };
    if (referenceKey) {
      whereClause.referenceKey = referenceKey;
    }

    const summary = await this.findOne({ where: whereClause });
    
    if (summary) {
      await summary.increment(fields);
      await summary.update({ lastCalculatedAt: new Date() });
    }
  }
}