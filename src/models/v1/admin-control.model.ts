import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

export type QuestionAnswerMode = "db" | "ai";

@Table({
  tableName: "admin_controls",
  timestamps: true,
})
export class AdminControl extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  botEnabled!: boolean;

  @AllowNull(false)
  @Default("db")
  @Column(DataType.ENUM("db", "ai"))
  questionAnswerMode!: QuestionAnswerMode;

  @AllowNull(true)
  @Column(DataType.UUID)
  updatedByUserId?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

