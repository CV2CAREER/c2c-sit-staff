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
} from 'sequelize-typescript';
import { User } from './user.model';
import { CredentialsTour } from './credentials-tour.model';

@Table({
  tableName: 'manual_applications',
  timestamps: true,
  indexes: [
    {
      name: 'idx_manual_application_client_id',
      fields: ['client_id'],
    },
    {
      name: 'idx_manual_application_created_at',
      fields: ['createdAt'],
    },
    {
      name: 'idx_manual_application_status',
      fields: ['Status'],
    },
    {
      name: 'idx_manual_application_credentials_tour_id',
      fields: ['credentialsTourId'],
    },
  ],
})
export class ManualApplication extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Client!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  Status?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  StatusReason?: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Job_Title!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  JobId!: string;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(700))
  Internal_Jobsite?: string;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(700))
  External_Jobsite?: string;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(700))
  Job_Type?: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Advertiser!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Location!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Country!: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  client_id?: string;

  @BelongsTo(() => User, 'client_id')
  user?: User;

  // Which of the client's credentials tours this manual application
  // belongs to, so applications can be attributed to a specific paid
  // campaign cycle.
  @ForeignKey(() => CredentialsTour)
  @AllowNull(true)
  @Column(DataType.UUID)
  credentialsTourId?: string;

  @BelongsTo(() => CredentialsTour, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  credentialsTour?: CredentialsTour;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(45))
  ApplicationSubmittedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  ApplicationSubmissionDate?: Date;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(45))
  DiscoveredBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  DiscoveryDate?: Date;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(45))
  VettedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  VettedDate?: Date;

  @AllowNull(true)
  @Column(DataType.TEXT)
  QualityScore?: string | null;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  CoverLetterRequired?: boolean | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  DeclinedReasons?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  ApprovedBy?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  ApprovedDate?: Date | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  ReturnReason?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  ReturnedBy?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  ReturnedDate?: Date | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  ai_score?: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  ai_reason?: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  ai_status?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  ai_classified_at?: Date | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  ai_prompt_version?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
