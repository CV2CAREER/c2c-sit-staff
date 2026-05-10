import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
  BeforeCreate,
  BeforeUpdate,
} from "sequelize-typescript";
import { Op } from "sequelize";
import { User } from "./user.model";
import { Profile } from "./profile.model";
import { Feature } from "./feature.model";

@Table({
  tableName: "plans",
  timestamps: true,
  paranoid: true, // Soft deletes (isDeleted functionality)
})
export class Plan extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.UUID)
  id!: string;

  // Foreign key to users table
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user!: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  // Foreign key to features table
  @ForeignKey(() => Feature)
  @AllowNull(false)
  @Column(DataType.UUID)
  featureId!: string;

  @BelongsTo(() => Feature, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  feature!: Feature;

  // Array of profile IDs (stored as UUID array)
  @AllowNull(false)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  profileIds!: string[];

  // Relationships for profiles
  @HasMany(() => Profile, "planId")
  profiles!: Profile[];

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  hasExpired!: boolean;

  // Validity period string (e.g., "30 days", "6 months", "1 year")
  @AllowNull(true)
  @Column(DataType.STRING)
  validityPeriod?: string;

  // Expiration date calculated from validityPeriod
  @AllowNull(true)
  @Column(DataType.DATEONLY)
  expiresAt?: Date;

  // PayPal Order ID
  @AllowNull(true)
  @Column(DataType.STRING)
  paypalOrderId?: string;

  // Payment status
  @AllowNull(false)
  @Default("awaiting_payment")
  @Column(DataType.ENUM("awaiting_payment", "completed", "failed", "refunded"))
  paymentStatus!: string;

  // Payment amount
  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  paymentAmount?: number;

  // Payment currency
  @AllowNull(true)
  @Default("AUD")
  @Column(DataType.STRING)
  paymentCurrency?: string;

  // PayPal capture details (JSON)
  @AllowNull(true)
  @Column(DataType.JSONB)
  paypalCaptureData?: object;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Soft delete timestamp (replaces isDeleted boolean)
  @Column(DataType.DATE)
  deletedAt?: Date;

  /**
   * Valid plan titles that qualify a referred user for referral rewards.
   */
  static VALID_PLAN_TITLES = ['Bronze', 'Silver', 'Gold', 'Platinum'];

  /**
   * Check if a user has a completed, non-expired, valid subscription plan.
   * This queries the actual Plan records — the authoritative source — rather than
   * relying on the
   */
  static async userHasValidPlan(userId: string): Promise<boolean> {
    const plan = await Plan.findOne({
      where: {
        userId,
        title: { [Op.in]: Plan.VALID_PLAN_TITLES },
        paymentStatus: 'completed',
        hasExpired: false,
      },
    });

    if (!plan) return false;

    // Also enforce expiresAt if set
    if (plan.expiresAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(plan.expiresAt);
      expiry.setHours(23, 59, 59, 999);
      if (expiry < today) return false;
    }

    return true;
  }

  // Hook to calculate expiresAt before save
  @BeforeCreate
  @BeforeUpdate
  static calculateExpiresAt(instance: Plan) {
    if (instance.featureId && instance.validityPeriod && !instance.expiresAt) {
      const temp = instance.validityPeriod.split(" ");
      const value = parseInt(temp[0].trim());
      const unit = temp[1].trim().toLowerCase();

      const currentDate = new Date();
      const validityDate = new Date(currentDate);

      switch (unit) {
        case "days":
        case "day":
          validityDate.setDate(validityDate.getDate() + value);
          break;
        case "months":
        case "month":
          validityDate.setMonth(validityDate.getMonth() + value);
          break;
        case "years":
        case "year":
        default:
          validityDate.setFullYear(validityDate.getFullYear() + value);
          break;
      }

      instance.expiresAt = validityDate;
    }
  }
}