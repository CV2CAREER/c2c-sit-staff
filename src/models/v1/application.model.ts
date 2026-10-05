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
import {
  ApplicationMode,
  ApplicationSourceType,
  SelectionType,
} from '../../utils/enum';
import { User } from './user.model';
import { CredentialsTour } from "./credentials-tour.model";

@Table({
  tableName: 'applications',
  timestamps: true,
  indexes: [
    {
      name: 'idx_application_client_id',
      fields: ['client_id'],
    },
    {
      name: 'idx_application_created_at',
      fields: ['createdAt'],
    },
    {
      name: 'idx_application_status',
      fields: ['Status'],
    },
  ],
})
export class Application extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Client!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Timestamp!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Internal_Jobsite!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  External_Jobsite!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Country!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  All_Words!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  Status?: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Category!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Job_Title!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  JobId!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Location!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Question!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Selection!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Options!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Job_Type!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Advertiser!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Screenshot!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Classification!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Date_Advertised!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  Run_Source!: string;

  @Default('N/A')
  @Column(DataType.STRING(700))
  SeekAnswersSource!: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.STRING)
  client_id?: string;

  @BelongsTo(() => User, 'client_id')
  user?: User;

  // Which of the client's credentials tours this application belongs to,
  // so applications can be attributed to a specific paid campaign cycle.
  @ForeignKey(() => CredentialsTour)
  @AllowNull(true)
  @Column(DataType.UUID)
  credentialsTourId?: string;

  @BelongsTo(() => CredentialsTour, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  credentialsTour?: CredentialsTour;

  @AllowNull(true)
  @Default('')
  @Column(DataType.STRING(255))
  bot_responsible?: string;

  @Default('N/A')
  @Column(DataType.STRING(255))
  SelectionType!: string;

  @AllowNull(true)
  @Default(1)
  @Column(DataType.INTEGER)
  FailedCount?: number;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(255))
  Requestor?: string;

  @AllowNull(true)
  @Default('System')
  @Column(DataType.STRING(100))
  updateBy?: string;

  @Default(ApplicationSourceType.GENERIC)
  @Column(DataType.STRING(15))
  Application_Source!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  InternalJobsite?: string;

  @AllowNull(true)
  @Column(DataType.STRING(192))
  ExternalJobsite?: string;

  @AllowNull(true)
  @Column(DataType.STRING(192))
  Allwords?: string;

  @AllowNull(true)
  @Default(ApplicationMode.UNATTENDED)
  @Column(DataType.STRING(25))
  Application_Mode?: string;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(255))
  Sample_Type?: string;

  @AllowNull(true)
  @Default('N/A')
  @Column(DataType.STRING(45))
  ApplicationSubmittedBy?: string;

  @AllowNull(true)
  @Column(DataType.STRING(10))
  MatchLevel?: string;

  // Assurance result (SPR-21-58-001): 'ASSURED' | 'FAILED' | null, with who and when.
  // Set by admins/assistants through PATCH /admin/applications/:id/assurance.
  @AllowNull(true)
  @Column(DataType.STRING(20))
  AssuranceStatus?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  AssuredBy?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  AssuranceDate?: Date | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
