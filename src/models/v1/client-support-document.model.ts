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
  Index,
} from "sequelize-typescript";
import { User } from "./user.model";
import type { RoleTitleRow } from "../../utils/roleTitleCsv";

/**
 * The supplementary upload categories offered on the client documents modal.
 * The values double as the multipart field names sent by the frontend.
 */
export enum ClientSupportDocumentCategory {
  ROLE_TITLE_RECOMMENDATIONS = "roleTitleRecommendations",
  SUPPORT_IMAGES = "supportImages",
  SUPPORT_SPREADSHEETS = "supportSpreadsheets",
}

export const CLIENT_SUPPORT_DOCUMENT_CATEGORIES = Object.values(
  ClientSupportDocumentCategory,
);

@Table({
  tableName: "client_support_documents",
  timestamps: true,
  paranoid: true,
  indexes: [
    { name: "idx_client_support_documents_client_id", fields: ["clientId"] },
    { name: "idx_client_support_documents_category", fields: ["category"] },
  ],
})
export class ClientSupportDocument extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  /** The client the document was uploaded for. */
  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  clientId!: string;

  @BelongsTo(() => User, {
    foreignKey: "clientId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  client?: User;

  @AllowNull(false)
  @Column(
    DataType.ENUM(...CLIENT_SUPPORT_DOCUMENT_CATEGORIES),
  )
  category!: ClientSupportDocumentCategory;

  /** Original filename as chosen by the uploader. */
  @AllowNull(false)
  @Column(DataType.STRING(255))
  filename!: string;

  /** Firebase Storage object path — pass to generateDownloadSignedUrl(). */
  @AllowNull(false)
  @Column(DataType.STRING(512))
  cloudFilename!: string;

  /** Public storage URL produced at upload time. */
  @AllowNull(true)
  @Column(DataType.STRING(1024))
  fileUrl?: string;

  @AllowNull(true)
  @Column(DataType.STRING(128))
  mimeType?: string;

  /** File size in bytes. */
  @AllowNull(true)
  @Column(DataType.BIGINT)
  size?: number;

  /** Free-form extras, e.g. parsed row count for a Role Title CSV. */
  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, unknown>;

  /**
   * Parsed contents of a Role Title Recommendations CSV — one entry per row
   * ({ roleTitle, classification, craft, industry, status,
   * aiCareerResilienceRating }). Null for the other categories.
   */
  @AllowNull(true)
  @Column(DataType.JSONB)
  roleTitles?: RoleTitleRow[];

  /** Set once the client confirms the shared role titles. */
  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  clientConfirmed!: boolean;

  /** Staff user id that uploaded the file. */
  @AllowNull(true)
  @Column(DataType.STRING)
  uploadedBy?: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  uploadedAt?: Date;

  /** Staff user id that last modified the record. */
  @AllowNull(true)
  @Column(DataType.STRING)
  updatedBy?: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted!: boolean;

  @Column(DataType.DATE)
  deletedAt?: Date;
}

export default ClientSupportDocument;
