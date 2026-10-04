import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { FaqArticle } from "./faq-article.model";

/**
 * Closed list of FAQ categories (C2C-252). Articles pick from this list rather
 * than typing a category, so "Payments" / "payments" / "Billing" can never
 * drift into separate categories the chatbot retrieves against.
 */
@Table({
  tableName: "faq_categories",
  timestamps: true,
})
export class FaqCategory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  displayOrder!: number;

  @HasMany(() => FaqArticle)
  articles?: FaqArticle[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
