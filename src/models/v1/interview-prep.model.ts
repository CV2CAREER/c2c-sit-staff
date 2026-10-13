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
} from "sequelize-typescript";
import { User } from "./user.model";

/**
 * InterviewPrepQuestionAnswer Model
 * 
 * Stores interview preparation questions and answers for users
 */
@Table({
  tableName: "interview_prep_question_answers",
  timestamps: true,
  indexes: [
    {
      name: "idx_interview_prep_user_id",
      fields: ["userId"],
    },
    {
      name: "idx_interview_prep_created_at",
      fields: ["createdAt"],
    },
  ],
})
export class InterviewPrepQuestionAnswer extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  userId!: string;

  @BelongsTo(() => User, { foreignKey: "userId", onDelete: "CASCADE" })
  user?: User;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isEmailSent!: boolean;

  @AllowNull(false)
  @Default("")
  @Column(DataType.STRING)
  userRole!: string;

  @Default("")
  @Column(DataType.STRING(2048))
  jobLink!: string;

  @Default("")
  @Column(DataType.TEXT)
  interviewerInformation!: string;

  @Default([])
  @Column(DataType.JSONB)
  uploadedDocuments!: Array<any>;

  @Default([])
  @Column(DataType.JSONB)
  interview!: Array<any>;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}