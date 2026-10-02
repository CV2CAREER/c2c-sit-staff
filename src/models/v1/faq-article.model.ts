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
  DeletedAt,
} from "sequelize-typescript";
import { FaqCategory } from "./faq-category.model";

/**
 * Three states instead of one Active checkbox (C2C-253): an answer can exist
 * and be reviewed without being live. Only `published` articles are visible
 * to clients or answerable by the chatbot.
 */
export const FAQ_ARTICLE_STATUSES = ["draft", "in_review", "published"] as const;

export type FaqArticleStatus = (typeof FAQ_ARTICLE_STATUSES)[number];

/**
 * A single FAQ question/answer — the one source of truth the public FAQ page
 * and the chatbot read from (S.ADM.12.04, replaces Train Chatbot S.ADM.12.01).
 */
@Table({
  tableName: "faq_articles",
  timestamps: true,
  paranoid: true,
})
export class FaqArticle extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  /** Short human reference shown in the admin list, e.g. FAQ-001. */
  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  code!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  question!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  answer!: string;

  @ForeignKey(() => FaqCategory)
  @AllowNull(false)
  @Column(DataType.STRING)
  categoryId!: string;

  @BelongsTo(() => FaqCategory)
  category?: FaqCategory;

  @AllowNull(false)
  @Default("draft")
  @Column(DataType.ENUM(...FAQ_ARTICLE_STATUSES))
  status!: FaqArticleStatus;

  /**
   * `false` keeps the article public on the FAQ page but stops the chatbot
   * from speaking it — refunds, billing, visas and complaints hand over to
   * Human Support instead.
   */
  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  botAnswerable!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  displayOrder!: number;

  /** Times clients opened this answer on the public /faq page. */
  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  viewCount!: number;

  @AllowNull(false)
  @Default("System")
  @Column(DataType.STRING)
  updatedBy!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  publishedBy?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  publishedAt?: Date | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @DeletedAt
  deletedAt?: Date | null;
}
