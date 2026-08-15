import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
  Unique,
  BeforeSave,
  AfterCreate,
  BeforeUpdate,
  AfterFind,
} from "sequelize-typescript";
import { User } from "./user.model";
import { Plan } from "./plan.model";
import { Classification, Question } from "../../types/profile.types";
import { AggregatorLink } from "../../types/aggregator.types";
import { fieldEncryption } from "../../utils/field-encryption";

@Table({
  tableName: "profiles",
  timestamps: true,
  indexes: [
    {
      name: "idx_profile_user_id",
      fields: ["userId"],
    },
    {
      name: "idx_profile_updated_at",
      fields: ["updatedAt"],
    },
  ],
})
export class Profile extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4) // ✅ Auto-generate UUID, no AutoIncrement
  @Column(DataType.STRING)
  id!: string;

  // Foreign key to users table
  @Unique("unique_user_profile_type")
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  user!: User;

  @Unique("unique_user_profile_type")
  @AllowNull(false)
  @Column({
    type: DataType.ENUM('primary', 'secondary'),
    defaultValue: 'primary'
  })
  name!: 'primary' | 'secondary';

  // Foreign key to plans table
  @ForeignKey(() => Plan)
  @AllowNull(true)
  @Column(DataType.STRING)
  planId?: string;

  @BelongsTo(() => Plan)
  plan?: Plan;

  @AllowNull(true)
  @Column(DataType.STRING)
  role?: string;

  // Array of strings
  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  titles?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  titlesExcluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  keywords?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  keywordsExcluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  includedJobTitles?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  advertisers?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  advertisersExcluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  advertisersInclude?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  advertisersExclude?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  industriesInclude?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  industriesExclude?: string[];
  
  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  situationIncluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  situationExcluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  jobTypes?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  jobTypesExcluded?: string[];
  
  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  minSalary?: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  maxSalary?: number;

  // Flexible classifications stored as JSONB
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  classifications?: Classification[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  classificationsExcluded?: Classification[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  workingRight?: string[];

  @AllowNull(true)
  @Column(DataType.STRING)
  country?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  courseOfStudy?: string;

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  state?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  city?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  locations?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  stateExcluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  municipals?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  municipalsExcluded?: string[];

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isResumeVariationDeveloped?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isAiForCriteriaSelectionAllowed?: boolean;

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  cityExcluded?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  body?: string[];

  @AllowNull(true)
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  bodyExcluded?: string[];

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  coverletterIncluded?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  roleKeywordExclusive?: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  additionalComments?: string;

  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  aggregators?: AggregatorLink[];

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isActive?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isSuspended?: boolean;

  @AllowNull(true)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isApproved?: boolean;

  @Column(DataType.VIRTUAL(DataType.STRING))
  get socialSecurityNumber(): string | undefined {
    return this.getDataValue("socialSecurityNumber") as string | undefined;
  }
  set socialSecurityNumber(value: string | undefined) {
    this.setDataValue("socialSecurityNumber", value);
  }

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  veteran?: boolean;

  @Column(DataType.VIRTUAL(DataType.STRING))
  get taxIdentificationNumber(): string | undefined {
    return this.getDataValue("taxIdentificationNumber") as string | undefined;
  }
  set taxIdentificationNumber(value: string | undefined) {
    this.setDataValue("taxIdentificationNumber", value);
  }

  @AllowNull(true)
  @Column(DataType.STRING)
  maritalStatus?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  disabilityStatus?: string;

  @Column(DataType.VIRTUAL(DataType.STRING))
  get dateOfBirth(): string | undefined {
    return this.getDataValue("dateOfBirth") as string | undefined;
  }
  set dateOfBirth(value: string | undefined) {
    this.setDataValue("dateOfBirth", value);
  }

  // Questions stored as JSONB array
  @AllowNull(true)
  @Default([])
  @Column(DataType.JSONB)
  questions?: Question[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BeforeSave
  static captureAndClearPlaintext(instance: Profile) {
    (instance as any)._pii_ssn = instance.getDataValue('socialSecurityNumber');
    (instance as any)._pii_tin = instance.getDataValue('taxIdentificationNumber');
    (instance as any)._pii_dob = instance.getDataValue('dateOfBirth');
    instance.setDataValue('socialSecurityNumber', null);
    instance.setDataValue('taxIdentificationNumber', null);
    instance.setDataValue('dateOfBirth', null);
  }

  @AfterCreate
  static async encryptSensitiveFieldsOnCreate(instance: Profile, options: any) {
    const pii = instance as any;
    await fieldEncryption.encryptProfileFields(
      instance.id,
      pii._pii_ssn ?? null,
      pii._pii_tin ?? null,
      pii._pii_dob ?? null,
      options.transaction,
    );
  }

  @BeforeUpdate
  static async encryptSensitiveFieldsOnUpdate(instance: Profile, options: any) {
    const changed = instance.changed();
    if (!changed) return;
    const pii = instance as any;
    if (changed.some(f => ['socialSecurityNumber', 'taxIdentificationNumber', 'dateOfBirth'].includes(f))) {
      await fieldEncryption.encryptProfileFields(
        instance.id,
        pii._pii_ssn ?? null,
        pii._pii_tin ?? null,
        pii._pii_dob ?? null,
        options.transaction,
      );
    }
  }

  @AfterFind
  static async decryptSensitiveFields(instances: Profile[] | Profile | null) {
    if (!instances) return;
    const list = Array.isArray(instances) ? instances : [instances];
    await Promise.all(list.map(async (instance) => {
      if (!instance?.id) return;
      try {
        const decrypted = await fieldEncryption.getDecryptedProfile(instance.id);
        if (!decrypted) return;
        if (decrypted.socialSecurityNumber) instance.setDataValue('socialSecurityNumber', decrypted.socialSecurityNumber);
        if (decrypted.taxIdentificationNumber) instance.setDataValue('taxIdentificationNumber', decrypted.taxIdentificationNumber);
        if (decrypted.dateOfBirth) instance.setDataValue('dateOfBirth', decrypted.dateOfBirth);
      } catch {}
    }));
  }
}
