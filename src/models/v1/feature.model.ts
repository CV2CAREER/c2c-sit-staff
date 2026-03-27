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
 * Subscription Tier Types
 */
export enum SubscriptionTier {
  EMERALD = "Emerald",
  CORAL = "Coral",
  FREE = "Free",
  COPPER = "Copper",
  BRONZE = "Bronze",
  SILVER = "Silver",
  GOLD = "Gold",
  PLATINUM = "Platinum",
}

@Table({
  tableName: "features",
  timestamps: true,
})
export class Feature extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID
  @Column(DataType.UUID)
  id!: string;

  // Subscription tier name (Bronze, Silver, Gold, Platinum, Copper)
  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  // Subscription tier enum
  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(SubscriptionTier)))
  tier!: SubscriptionTier;

  // Price in AUD (base currency)
  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  // Number of client profile applications allowed
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  jobApplications!: number;

  // Number of CV/Resume uplift/re-development requests (complimentary)
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  cvResumeRequests!: number;

  // Number of screening prep sessions
  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  screeningPrep?: number;

  // Number of interview prep sessions
  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  interviewPrep?: number;

  // Number of resume development requests
  @AllowNull(true)
  @Default(0)
  @Column(DataType.INTEGER)
  resumeDevelopment?: number;

  // Validity period string (e.g., "6 months", "12 months", "1 year")
  @AllowNull(false)
  @Column(DataType.STRING)
  validityPeriod!: string;

  // Pause option in months (0, 6, etc.)
  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  pauseOptionMonths!: number;

  // Subscription break description
  @AllowNull(false)
  @Column(DataType.STRING)
  subscriptionBreak!: string;

  // Maximum number of profiles allowed
  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  profileLimit!: number;

  // Whether this is a top-up/upgrade plan
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isTopUp!: boolean;

  // Description of the plan features
  @AllowNull(true)
  @Column(DataType.TEXT)
  description?: string;

  // Extra notes or information
  @AllowNull(true)
  @Column(DataType.TEXT)
  extra?: string;

  // Whether the plan is active
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  // Array of location IDs where this plan is available
  // Note: This is stored as a simple array of UUIDs (no FK constraint)
  // PostgreSQL doesn't support foreign keys on ARRAY columns
  @AllowNull(false)
  @Default([])
  @Column(DataType.ARRAY(DataType.UUID))
  locationIds!: string[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
