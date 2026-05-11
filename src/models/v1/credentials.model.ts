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
  CreatedAt,
  UpdatedAt,
  BeforeCreate,
} from "sequelize-typescript";
import { User } from "./user.model";
import { SeekExternalCredentials } from "../../types/credentials.types";

@Table({
  tableName: "credentials",
  timestamps: true,
  paranoid: true,
})
export class Credentials extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string;

  @BeforeCreate
  static async generateId(instance: Credentials) {
    if (!instance.id) {
      const lastCredential = await Credentials.findOne({
        order: [["id", "DESC"]],
        attributes: ["id"],
        paranoid: false,
      });
      const lastId = lastCredential?.id;
      const lastNumericId = lastId ? parseInt(lastId, 10) : 0;
      instance.id = isNaN(lastNumericId) ? "1" : String(lastNumericId + 1);
    }
  }

  @AllowNull(true)
  @Column(DataType.STRING(64))
  seekEmail?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  seekPassword?: string;

  @AllowNull(true)
  @Column(DataType.STRING(32))
  seekCredentialsTest?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  seekCredentialsTestDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  currentCity?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  onboardingDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  criteriaReviewCompleted?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  referrer?: string;

  @AllowNull(true)
  @Column(DataType.STRING(64))
  blacklisted?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  seekLoginType?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  seekExternalCredentials?: SeekExternalCredentials;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  clientId?: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  client?: User;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @Column(DataType.DATE)
  deletedAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  AssignedPCName?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  AssignedPCEmail?: string;

  @AllowNull(true)
  @Default('FLIGHT')
  @Column(DataType.STRING(32))
  capitalized?: string;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  Active?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  SeekAnswerPriority?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  SeekAggregator?: boolean;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  SeekSubStartDate?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  updatedBy?: string;
}
