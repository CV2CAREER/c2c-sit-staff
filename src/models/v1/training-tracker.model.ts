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
import { Session } from "./session.model";

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
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User, { foreignKey: "userId", targetKey: "id" })
  user!: User;

  @ForeignKey(() => Session)
  @AllowNull
  @Column(DataType.UUID)
  sessionId?: string;

  @AllowNull
  @Column(DataType.INTEGER)
  sessionNumber?: number;
  
  @BelongsTo(() => Session, { foreignKey: "sessionId", targetKey: "id" })
  session?: Session;

  @ForeignKey(() => User)
  @AllowNull
  @Column(DataType.UUID)
  pcId!: string;

  @BelongsTo(() => User, { foreignKey: "pcId", targetKey: "id" })
  pc!: User;

  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  fullName!: string;

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

  // Additional metadata
  @Column(DataType.DATE)
  deletedAt!: Date;

  @Column(DataType.UUID)
  deletedBy!: string;
}
