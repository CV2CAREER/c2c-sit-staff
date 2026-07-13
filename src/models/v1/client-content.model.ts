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

export const CLIENT_CONTENT_KEYS = [
  "post_payment_terms",
  "cv_upload_terms",
  "private_data_copy",
  "public_data_copy",
  "features_content",
] as const;

export type ClientContentKey = (typeof CLIENT_CONTENT_KEYS)[number];

export const CLIENT_CONTENT_STATUSES = ["published", "draft"] as const;

export type ClientContentStatus = (typeof CLIENT_CONTENT_STATUSES)[number];

/**
 * Copy the business maintains for the client app. Rows are seeded once and then
 * only ever updated — `key` is the contract the client app reads by, so it is
 * unique and must not change after a block has shipped.
 */
@Table({
  tableName: "client_contents",
  timestamps: true,
})
export class ClientContent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  key!: ClientContentKey;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @AllowNull(false)
  @Default("")
  @Column(DataType.STRING)
  description!: string;

  /** Where in the client app this block surfaces. */
  @AllowNull(false)
  @Default("")
  @Column(DataType.STRING)
  placement!: string;

  /** `group` is reserved in SQL, so the column is stored as `groupName`. */
  @AllowNull(false)
  @Column({ type: DataType.STRING, field: "groupName" })
  group!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  body!: string;

  @AllowNull(false)
  @Default("draft")
  @Column(DataType.ENUM(...CLIENT_CONTENT_STATUSES))
  status!: ClientContentStatus;

  @AllowNull(false)
  @Default(1)
  @Column(DataType.INTEGER)
  version!: number;

  @AllowNull(false)
  @Default("System")
  @Column(DataType.STRING)
  updatedBy!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
