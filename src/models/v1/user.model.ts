import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  HasOne,
  HasMany,
  BeforeCreate,
  BeforeSave,
  AfterCreate,
  BeforeUpdate,
  AfterFind,
} from "sequelize-typescript";
import { Op } from "sequelize";
import {
  ApplicationStatus,
  CustomerClass,
  Gender,
  PaymentStatus,
  Progress,
  RevenueStatus,
  Role,
  SampleDispatchedStatus,
  SocialPlatform,
} from "../../utils/enum";
import {
  Milestone,
  PermissionData,
  ProfilePicture,
} from "../../types/user.types";
import { ResumeReview, ServiceHistory } from "../../types/userdocument.types";
import { fieldEncryption } from "../../utils/field-encryption";
import { Profile } from "./profile.model";
import { Referrer } from "./referrer.model";
import { Partner } from "./partner.model";
import { SalesConsultant } from "./sales-consultant.model";
import { CustomerService } from "./customer-service.model";
import { Location } from "./location.model";
import { Aggregator } from "./aggregator.model";
import { Credentials } from "./credentials.model";
import { Plan } from "./plan.model";

@Table({
  tableName: "users",
  timestamps: true,
  paranoid: true, // Soft deletes (isDeleted functionality)
  scopes: {
    active: {
      where: {
        isActive: true,
        deletedAt: null,
      },
    },
    notDeleted: {
      where: {
        deletedAt: null,
      },
    },
  },
})
export class User extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(true)
  @Unique
  @Column(DataType.STRING)
  uniqueId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  zohoId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  password!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  firstName!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  lastName!: string;

  @AllowNull(false)
  @Default(Gender.PREFER_NOT_TO_SAY)
  @Column(DataType.ENUM(...Object.values(Gender)))
  gender!: Gender;

  @AllowNull(true)
  @Column(DataType.STRING)
  middleName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  businessName?: string;

  @AllowNull(false)
  @Default(CustomerClass.NA)
  @Column(DataType.ENUM(...Object.values(CustomerClass)))
  customerClass!: CustomerClass;

  @AllowNull(true)
  @Column(DataType.STRING)
  phoneNumber?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  whatsappNumber?: string;

  // Stored as JSONB for flexibility (previously Mixed)
  @AllowNull(true)
  @Column(DataType.JSONB)
  profilePicture?: ProfilePicture;

  // Array of enums stored as JSONB or ARRAY
  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  socials!: SocialPlatform[];

  @AllowNull(false)
  @Column(DataType.STRING)
  country!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  slackId?: string;

  @HasOne(() => Referrer, "userId")
  referrer?: Referrer;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  promotionalCount!: number;

  @AllowNull(false)
  @Default(5)
  @Column(DataType.INTEGER)
  numberOfReferralsBeforePromo!: number;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  numberOfFreePromo!: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  numberOfFreePromoCount!: number;

  // Array of embedded objects stored as JSONB
  @AllowNull(true)
  @Default([{ csr: false, pc: false, hr: false, po: false }])
  @Column(DataType.JSONB)
  review!: ResumeReview[];

  // Array of embedded objects stored as JSONB
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  serviceHistory!: ServiceHistory[];

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isApplicationStarted!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  resetTokenVerified!: boolean;

  @AllowNull(false)
  @Default(ApplicationStatus.COMMENCED)
  @Column(DataType.ENUM(...Object.values(ApplicationStatus)))
  applicationStatus!: ApplicationStatus;

  @AllowNull(false)
  @Default(PaymentStatus.UNPAID)
  @Column(DataType.ENUM(...Object.values(PaymentStatus)))
  paymentStatus!: PaymentStatus;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  totalAmountPaid!: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  prepSessionStatus!: 0 | 1 | 2;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  isSampleResultsAccepted?: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isEmailVerified!: boolean;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isUserSubscribed!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDocumentApproved!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDocumentUploaded!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  campaignActive!: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isAmbassador?: boolean;

  @AllowNull(true)
  @Unique
  @Column(DataType.STRING)
  ambassadorToken?: string | null;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  hasActiveSubscription!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  hasOpenedJobsiteProfile!: boolean;

  @AllowNull(false)
  @Default("System")
  @Column(DataType.STRING)
  updatedBy!: string;

  @AllowNull(false)
  @Default(Progress.EMAIL_VERIFIED)
  @Column(DataType.ENUM(...Object.values(Progress)))
  progress!: Progress;

  // Foreign Keys - assuming Profile model exists
  @ForeignKey(() => Profile)
  @AllowNull(true)
  @Column(DataType.STRING)
  profileId?: string;

  @ForeignKey(() => Profile)
  @AllowNull(true)
  @Column(DataType.STRING)
  secondaryProfileId?: string;

  @BelongsTo(() => Profile, "profileId")
  profile?: Profile;

  @BelongsTo(() => Profile, "secondaryProfileId")
  secondaryProfile?: Profile;

  @AllowNull(false)
  @Default(Role.GUEST)
  @Column(DataType.ENUM(...Object.values(Role)))
  role!: Role;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  manager!: boolean;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  agreeToTerms!: boolean;

  // Array of permission objects stored as JSONB
  // Alternative: Normalize to separate UserPermission table for complex queries
  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  permissions!: PermissionData[];

  @AllowNull(true)
  @Column(DataType.TEXT)
  accessToken?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  bankName?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  bsbCode?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  bankAccountNo?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  bankAccountName?: string;

  @AllowNull(false)
  @Default(SampleDispatchedStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(SampleDispatchedStatus)))
  isSampleDispatched!: SampleDispatchedStatus;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  returnCount!: number;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  isSampleAccepted?: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  stars!: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  promotionCode?: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  allowFreeBeforeReferal!: boolean;

  // Array of milestone objects stored as JSONB
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  userSessionsMilestones!: Milestone[];

  @AllowNull(true)
  @Column(DataType.STRING)
  currentCityOfResidence?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  selectedPlan?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  plan?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  adminPassword?: string;

  @AllowNull(false)
  @Default(RevenueStatus.UNPAID)
  @Column(DataType.ENUM(...Object.values(RevenueStatus)))
  revenue!: RevenueStatus;

  // In User.ts
  @HasOne(() => Partner)
  partner?: Partner;

  @HasOne(() => SalesConsultant)
  salesConsultant?: SalesConsultant;

  @HasOne(() => CustomerService)
  customerService?: CustomerService;

  // Foreign key to locations table
  @ForeignKey(() => Location)
  @AllowNull(true)
  @Column(DataType.STRING)
  locationId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  referrROle?: string;

  @BelongsTo(() => Location, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  location?: Location;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  deletedBy?: string;

  // Aggregator relationship
  @HasMany(() => Aggregator, "userId")
  aggregators?: Aggregator[];

  // Credentials relationship
  @HasOne(() => Credentials, "clientId")
  credentials?: Credentials;

  // Plan relationship
  @ForeignKey(() => Plan)
  @AllowNull(true)
  @Column(DataType.STRING)
  planId?: string;

  @BelongsTo(() => Plan, "planId")
  activePlan?: Plan;

  // Timestamps
  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Soft delete timestamp (replaces isDeleted boolean)
  @Column(DataType.DATE)
  deletedAt?: Date;

  @BeforeCreate
  static async generateId(instance: User, options: any) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxId = await User.max('id', {
      where: {
        id: {
          [Op.like]: `${today}%`
        }
      },
      transaction: options.transaction
    });
    let nextNum = 1;
    if (maxId) {
      const numPart = (maxId as string).slice(8);
      nextNum = parseInt(numPart, 10) + 1;
    }
    const padded = nextNum.toString().padStart(3, '0');
    instance.id = today + padded;
  }

  @BeforeSave
  static captureAndClearPlaintext(instance: User) {
    (instance as any)._pii_email = instance.getDataValue('email');
    (instance as any)._pii_phoneNumber = instance.getDataValue('phoneNumber');
    (instance as any)._pii_whatsappNumber = instance.getDataValue('whatsappNumber');
    (instance as any)._pii_bankName = instance.getDataValue('bankName');
    (instance as any)._pii_bsbCode = instance.getDataValue('bsbCode');
    (instance as any)._pii_bankAccountNo = instance.getDataValue('bankAccountNo');
    (instance as any)._pii_bankAccountName = instance.getDataValue('bankAccountName');
    instance.setDataValue('email', null);
    instance.setDataValue('phoneNumber', null);
    instance.setDataValue('whatsappNumber', null);
    instance.setDataValue('bankName', null);
    instance.setDataValue('bsbCode', null);
    instance.setDataValue('bankAccountNo', null);
    instance.setDataValue('bankAccountName', null);
  }

  @AfterCreate
  static async encryptSensitiveFieldsOnCreate(instance: User, options: any) {
    const pii = instance as any;
    await fieldEncryption.encryptUserFields(
      instance.id,
      pii._pii_email,
      pii._pii_phoneNumber ?? null,
      pii._pii_whatsappNumber ?? null,
      options.transaction,
    );
    await fieldEncryption.encryptUserBankFields(
      instance.id,
      pii._pii_bankName ?? null,
      pii._pii_bsbCode ?? null,
      pii._pii_bankAccountNo ?? null,
      pii._pii_bankAccountName ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptSensitiveFieldsOnUpdate(instance: User, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    const pii = instance as any;
    if (changed.some(f => ['email', 'phoneNumber', 'whatsappNumber'].includes(f))) {
      await fieldEncryption.encryptUserFields(
        instance.id,
        pii._pii_email,
        pii._pii_phoneNumber ?? null,
        pii._pii_whatsappNumber ?? null,
        options.transaction,
      );
    }
    if (changed.some(f => ['bankName', 'bsbCode', 'bankAccountNo', 'bankAccountName'].includes(f))) {
      await fieldEncryption.encryptUserBankFields(
        instance.id,
        pii._pii_bankName ?? null,
        pii._pii_bsbCode ?? null,
        pii._pii_bankAccountNo ?? null,
        pii._pii_bankAccountName ?? null,
        options.transaction,
      );
    }
  }

  @AfterFind
  static async decryptSensitiveFields(instances: User[] | User | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      try {
        const decrypted = await fieldEncryption.getDecryptedUser(instance.id);
        if (decrypted?.email) instance.setDataValue('email', decrypted.email);
        if (decrypted?.phoneNumber) instance.setDataValue('phoneNumber', decrypted.phoneNumber);
        if (decrypted?.whatsappNumber) instance.setDataValue('whatsappNumber', decrypted.whatsappNumber);
      } catch {}
      try {
        const bank = await fieldEncryption.getDecryptedUserBank(instance.id);
        if (bank?.bankName) {
          instance.setDataValue('bankName', bank.bankName);
          instance.setDataValue('bsbCode', bank.bsbCode);
          instance.setDataValue('bankAccountNo', bank.bankAccountNo);
          instance.setDataValue('bankAccountName', bank.bankAccountName);
        }
      } catch {}
    }));
  }
}
