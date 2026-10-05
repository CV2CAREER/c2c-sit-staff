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
  AfterUpdate,
  AfterFind,
  BeforeFind,
} from "sequelize-typescript";
import { Op } from "sequelize";
import {
  ApplicationStatus,
  Perception,
  Gender,
  PaymentStatus,
  Progress,
  RevenueStatus,
  Role,
  SignUpAs,
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
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("user.model");

const PII_CONTACT_FIELDS = ["email", "phoneNumber", "whatsappNumber"];
const PII_BANK_FIELDS = ["bankName", "bsbCode", "bankAccountNo", "bankAccountName"];

const wantsField = (attributes: any, fieldName: string): boolean => {
  if (!attributes) return true;
  if (Array.isArray(attributes)) {
    return attributes.some((a) => (typeof a === "string" ? a === fieldName : false));
  }
  if (typeof attributes === "object") {
    const { include, exclude } = attributes as any;
    if (Array.isArray(include)) {
      return include.some((a) => (typeof a === "string" ? a === fieldName : false));
    }
    if (Array.isArray(exclude)) {
      return !exclude.includes(fieldName);
    }
  }
  return true;
};

const wantsContactDecrypt = (attributes: any): boolean =>
  PII_CONTACT_FIELDS.some((f) => wantsField(attributes, f));

const wantsBankDecrypt = (attributes: any): boolean =>
  PII_BANK_FIELDS.some((f) => wantsField(attributes, f));

import { Profile } from "./profile.model";import { Referrer } from "./referrer.model";
import { Partner } from "./partner.model";
import { SalesConsultant } from "./sales-consultant.model";
import { CustomerService } from "./customer-service.model";
import { Location } from "./location.model";
import { Aggregator } from "./aggregator.model";
import { Credentials } from "./credentials.model";
import { Plan } from "./plan.model";
import { ClientJourneyStep } from "./client-journey-step.model";

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

  @Column(DataType.VIRTUAL(DataType.STRING))
  get email(): string {
    return this.getDataValue("email") as string;
  }
  set email(value: string) {
    this.setDataValue("email", value);
  }

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
  @Default(Perception.TBD)
  @Column(DataType.ENUM(...Object.values(Perception)))
  staffPerception!: Perception;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  auditRequired!: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  auditFindings?: string | null;

  @Column(DataType.VIRTUAL(DataType.STRING))
  get phoneNumber(): string | undefined {
    return this.getDataValue("phoneNumber") as string | undefined;
  }
  set phoneNumber(value: string | undefined) {
    this.setDataValue("phoneNumber", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get whatsappNumber(): string | undefined {
    return this.getDataValue("whatsappNumber") as string | undefined;
  }
  set whatsappNumber(value: string | undefined) {
    this.setDataValue("whatsappNumber", value);
  }

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

  // SPR-19-16-021: "Where did you hear about us?" — written once at
  // registration on the customer backend, nullable, no backfill (existing
  // accounts render as "Not Recorded"). Read-only here; this admin surface
  // only displays/filters/exports it, never edits it.
  @AllowNull(true)
  @Column({ type: DataType.STRING, field: "hear_about_us" })
  hearAboutUs?: string;

  // SPR-19-07-005: admin waiver for the social verification gate. Set true
  // when admin exempts a user from the "capture all 7 handles" requirement.
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  socialVerificationExempt!: boolean;

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
  @Default(ApplicationStatus.NOT_STARTED)
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

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isRestricted?: boolean;

  // Partner-referred Emerald persona marker. Mirrored from customer BE —
  // shared DB. Staff BE reads this to drive admin UI persona display and
  // may flip it to false when a paid plan is manually assigned to the user.
  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isEmeraldCandidate?: boolean;

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

  // What the user actually picked in the "Sign up as" field at registration —
  // unlike `role`, this is never remapped afterwards (e.g. ambassador stays Ambassador here).
  @AllowNull(true)
  @Column(DataType.ENUM(...Object.values(SignUpAs)))
  signUpAs?: SignUpAs;

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

  @Column(DataType.VIRTUAL(DataType.STRING))
  get bankName(): string | undefined {
    return this.getDataValue("bankName") as string | undefined;
  }
  set bankName(value: string | undefined) {
    this.setDataValue("bankName", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get bsbCode(): string | undefined {
    return this.getDataValue("bsbCode") as string | undefined;
  }
  set bsbCode(value: string | undefined) {
    this.setDataValue("bsbCode", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get bankAccountNo(): string | undefined {
    return this.getDataValue("bankAccountNo") as string | undefined;
  }
  set bankAccountNo(value: string | undefined) {
    this.setDataValue("bankAccountNo", value);
  }

  @Column(DataType.VIRTUAL(DataType.STRING))
  get bankAccountName(): string | undefined {
    return this.getDataValue("bankAccountName") as string | undefined;
  }
  set bankAccountName(value: string | undefined) {
    this.setDataValue("bankAccountName", value);
  }

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
  
  // Client journey step-completion relationship
  @HasMany(() => ClientJourneyStep, "userId")
  journeySteps?: ClientJourneyStep[];

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

  @AfterUpdate
  static restorePlaintextOnUpdate(instance: User) {
    const pii = instance as any;
    if (pii._pii_email) instance.setDataValue('email', pii._pii_email);
    if (pii._pii_phoneNumber) instance.setDataValue('phoneNumber', pii._pii_phoneNumber);
    if (pii._pii_whatsappNumber) instance.setDataValue('whatsappNumber', pii._pii_whatsappNumber);
    if (pii._pii_bankName) instance.setDataValue('bankName', pii._pii_bankName);
    if (pii._pii_bsbCode) instance.setDataValue('bsbCode', pii._pii_bsbCode);
    if (pii._pii_bankAccountNo) instance.setDataValue('bankAccountNo', pii._pii_bankAccountNo);
    if (pii._pii_bankAccountName) instance.setDataValue('bankAccountName', pii._pii_bankAccountName);
  }

  @BeforeFind
  static async captureRequestedAttributes(options: any) {
    (options as any).__requestedAttributes = options?.attributes;
  }

  @AfterFind
  static async decryptSensitiveFields(instances: User[] | User | null, options: any) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    const ids = list.filter(i => i?.id).map(i => i.id);
    if (!ids.length) return;

    const attributes = (options as any)?.__requestedAttributes;

    let contactMap = new Map();
    let bankMap = new Map();
    if (wantsContactDecrypt(attributes)) {
      try {
        contactMap = await fieldEncryption.getDecryptedUsersBatch(ids);
      } catch (error: any) {
        logger.warn(`Failed to batch-decrypt contact fields: ${error?.message || error}`);
      }
    }
    if (wantsBankDecrypt(attributes)) {
      try {
        bankMap = await fieldEncryption.getDecryptedUsersBankBatch(ids);
      } catch (error: any) {
        logger.warn(`Failed to batch-decrypt bank fields: ${error?.message || error}`);
      }
    }

    for (const instance of list) {
      if (!instance?.id) continue;
      const contact = contactMap.get(instance.id);
      if (contact) {
        if (contact.email) instance.setDataValue('email', contact.email);
        if (contact.phoneNumber) instance.setDataValue('phoneNumber', contact.phoneNumber);
        if (contact.whatsappNumber) instance.setDataValue('whatsappNumber', contact.whatsappNumber);
      }
      const bank = bankMap.get(instance.id);
      if (bank?.bankName) {
        instance.setDataValue('bankName', bank.bankName);
        instance.setDataValue('bsbCode', bank.bsbCode);
        instance.setDataValue('bankAccountNo', bank.bankAccountNo);
        instance.setDataValue('bankAccountName', bank.bankAccountName);
      }
    }
  }
}
