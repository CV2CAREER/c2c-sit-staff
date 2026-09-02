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
} from "sequelize-typescript";
import { EmailTemplate } from "./email-template.model";

/**
 * Optional override binding a trigger key (the literal templateName string a
 * sendMail() call site already passes) to a specific EmailTemplate. Absence
 * of a row for a given triggerKey means "use the default" — the EmailTemplate
 * whose own `key` equals that triggerKey, exactly like today. Deleting a row
 * reverts that trigger to the default with no other side effects.
 */
@Table({
  tableName: "email_template_triggers",
  timestamps: true,
})
export class EmailTemplateTrigger extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(128))
  triggerKey!: string;

  @ForeignKey(() => EmailTemplate)
  @AllowNull(false)
  @Column(DataType.STRING)
  templateId!: string;

  @BelongsTo(() => EmailTemplate, {
    foreignKey: "templateId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  template?: EmailTemplate;

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default EmailTemplateTrigger;
