import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  AllowNull
} from "sequelize-typescript";
import { User } from "./user.model";
import { TrainingTrackerSession } from "./training-tracker-session.model";

@Table({
  tableName: "training_trackers",
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      name: "idx_training_tracker_user_id",
      fields: ["userId"]
    },
    {
      name: "idx_training_tracker_session_id",
      fields: ["sessionId"]
    },
    {
      name: "idx_training_tracker_pc_id",
      fields: ["pcId"]
    },
    {
      name: "idx_training_tracker_full_name",
      fields: ["fullName"]
    }
  ]
})
export class TrainingTracker extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, { foreignKey: "userId", targetKey: "id", onDelete: "SET NULL" })
  user!: User;

  @ForeignKey(() => TrainingTrackerSession)
  @AllowNull
  @Column(DataType.STRING)
  sessionId?: string;
  
  @BelongsTo(() => TrainingTrackerSession, { foreignKey: "sessionId", targetKey: "id" })
  session?: TrainingTrackerSession;

  @ForeignKey(() => User)
  @AllowNull
  @Column(DataType.STRING)
  pcId!: string;

  @BelongsTo(() => User, { foreignKey: "pcId", targetKey: "id" })
  pc!: User;

  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  fullName!: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  date?: string;

  @AllowNull(true)
  @Default("Pending")
  @Column(DataType.STRING)
  status?: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  notes?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  progress?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reworkType?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  // Main Assessment Fields
  @Column(DataType.INTEGER)
  wmtycDecomposition!: number;

  @Column(DataType.INTEGER)
  smeTechnicalDepth!: number;

  @Column(DataType.INTEGER)
  deliverablesQuantification!: number;

  @Column(DataType.INTEGER)
  locationYearroleInTimeExample!: number;

  @Column(DataType.INTEGER)
  selfPronounUsage!: number;

  @Column(DataType.INTEGER)
  businessDeliverables!: number;

  @Column(DataType.INTEGER)
  grammardictioncommunication!: number;

  @Column(DataType.INTEGER)
  personabilitylikeabilityhumor!: number;

  @Column(DataType.INTEGER)
  respectcurtesy!: number;

  @Column(DataType.INTEGER)
  appearance!: number;

  @Column(DataType.INTEGER)
  assessment!: number;

  // PC Assessment Fields
  @Column(DataType.INTEGER)
  pleasantriessmallTalk!: number;

  @Column(DataType.INTEGER)
  sessionObjectives!: number;

  @Column(DataType.INTEGER)
  professionIntroduction!: number;

  @Column(DataType.INTEGER)
  kpiDescriptionWithExamples!: number;

  @Column(DataType.INTEGER)
  cvresumeRendition!: number;

  @Column(DataType.INTEGER)
  respectcourtesyempathyhumility!: number;

  @Column(DataType.INTEGER)
  kpiCollaborativeScoring!: number;

  @Column(DataType.INTEGER)
  recordingAvailabilitySurvey!: number;

  @Column(DataType.INTEGER)
  maximumNumberOfQuestions!: number;

  @Column(DataType.INTEGER)
  complementingpositiveFeedback!: number;

  @Column(DataType.INTEGER)
  clientMultipleGosOnAllQs!: number;

  @Column(DataType.INTEGER)
  timeUtilization!: number;

  @Column(DataType.INTEGER)
  clientStoryResponses!: number;

  @Column(DataType.INTEGER)
  partingQuestions!: number;

  @Column(DataType.INTEGER)
  timeKeeping!: number;

  @Column(DataType.INTEGER)
  fillerPhrases!: number;

  @Column(DataType.INTEGER)
  intermittentClarificationRequest!: number;

  @Column(DataType.INTEGER)
  perfectAlternateResponses!: number;

  @Column(DataType.INTEGER)
  audiovisualRoomLighteningSetup!: number;

  @Column(DataType.INTEGER)
  pcAssessment!: number;

  // Session / scheduling fields
  @AllowNull(true)
  @Column(DataType.DATEONLY)
  coachingContact?: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  coachingBooking?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  start?: string;

  @AllowNull(true)
  @Column(DataType.INTEGER)
  duration?: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  sessionType?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  surveyvideo?: string;

  // Background / profile fields
  @AllowNull(true)
  @Column(DataType.STRING)
  preferredCraft?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  undergrad?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  postgrad?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  training?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  experience?: string;

  // CV development status & reviewer fields
  @AllowNull(true)
  @Column(DataType.STRING)
  developmentStatus?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reviewer1?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reviewer2?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  reviewer3?: string;

  // CV checklist — boolean fields
  @Default(false)
  @Column(DataType.BOOLEAN)
  overarchingRoleAndIndustryIdentified!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  personalDataGrouping!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  narrativeBasedGroupings!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  professionalSummary!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  technicalSkills!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  softSkills!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  jobDescriptionModification!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  factBasedGroupings!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  businessNameBusinessLocation!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  roleTitle!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  dateFormat!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  educationFormat!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  additionals!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  colourHighlightNewText!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  layoutModification!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  findReplaceAnd!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  paragraphing!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  alignment!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  textSpacing!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  differentiationOfEachRoleTitle!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  roleNarrativeDifferentiation!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  dateSerializationRationalization!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  roleSegmentation!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  grammerreadabilityEase!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  smeTechnicalContent!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  clientRequirementsAssessment!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  dispatchToClient!: boolean;

  // Additional metadata
  @Column(DataType.DATE)
  deletedAt!: Date;

  @Column(DataType.STRING)
  deletedBy!: string;
}
