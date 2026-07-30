import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  Unique,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

export enum EmailTemplateType {
  ADMIN = "admin",
  CUSTOMER = "customer",
}

export const EMAIL_TEMPLATE_TYPES = Object.values(EmailTemplateType);

/**
 * DB-backed replacement for the .ejs files under views/emails. `key` is the
 * exact templateName string call sites already pass to sendMail (e.g.
 * "welcome-email.ejs"), so the file-to-row migration is a straight key match.
 */
@Table({
  tableName: "email_templates",
  timestamps: true,
  paranoid: true,
})
export class EmailTemplate extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(128))
  key!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  name!: string;

  @AllowNull(false)
  @Default(EmailTemplateType.CUSTOMER)
  @Column(DataType.ENUM(...EMAIL_TEMPLATE_TYPES))
  type!: EmailTemplateType;

  @AllowNull(false)
  @Column(DataType.TEXT)
  body!: string;

  /** Placeholder names available to this template (e.g. ["name", "frontendUrl"]) —
   * lets the admin UI offer a click-to-insert picker instead of requiring EJS syntax. */
  @AllowNull(false)
  @Default([])
  @Column(DataType.JSONB)
  variables!: string[];

  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  deletedAt?: Date;

  @AllowNull(true)
  @Column(DataType.STRING)
  deletedBy?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default EmailTemplate;
