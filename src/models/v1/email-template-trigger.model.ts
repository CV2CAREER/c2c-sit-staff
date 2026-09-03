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
 * sendMail() call site already passes) to a specific EmailTemplate. Three
 * states: no row = use the default (the EmailTemplate whose own `key` equals
 * the triggerKey, exactly like today); a row with `templateId` set = send
 * that template instead; a row with `templateId` null = send nothing at all
 * for this trigger. Deleting a row reverts that trigger to the default.
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

  /** Null means "this trigger is disabled — send nothing." */
  @ForeignKey(() => EmailTemplate)
  @AllowNull(true)
  @Column(DataType.STRING)
  templateId?: string | null;

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
