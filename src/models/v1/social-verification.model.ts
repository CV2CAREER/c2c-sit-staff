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
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { User } from "./user.model";

// SPR-19-07-005: mirror of the customer BE SocialVerification model. Both
// backends share the same Postgres DB — this file has to stay in shape with
// c2c-iat-customer-backend/src/models/v1/social-verification.model.ts.
export type SocialPlatformSlug =
  | "facebook"
  | "x"
  | "youtube"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "threads";

export const SOCIAL_PLATFORM_SLUGS: SocialPlatformSlug[] = [
  "facebook",
  "x",
  "youtube",
  "instagram",
  "linkedin",
  "tiktok",
  "threads",
];

@Table({
  tableName: "social_verifications",
  timestamps: true,
  indexes: [
    {
      name: "uniq_social_verification_per_user_platform",
      unique: true,
      fields: ["userId", "platform"],
    },
    { fields: ["userId"] },
  ],
})
export class SocialVerification extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, { foreignKey: "userId", onDelete: "CASCADE" })
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  platform!: SocialPlatformSlug;

  @AllowNull(false)
  @Column(DataType.STRING)
  username!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  profileUrl?: string | null;

  // verifiedAt is stamped when an admin approves the row.
  @AllowNull(true)
  @Column(DataType.DATE)
  verifiedAt?: Date | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  lastCheckedAt?: Date | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
