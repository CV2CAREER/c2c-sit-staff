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
import { Credentials } from "./credentials.model";

/**
 * A freeform staff note left on a client's campaign — surfaced in the
 * Placement Management > Assignments drawer. authorName is a snapshot
 * (same rationale as CredentialsTour.planTitle) so a comment stays
 * attributable even if the author's own record later changes.
 */
@Table({
  tableName: "credentials_comments",
  timestamps: true,
  indexes: [
    { name: "idx_credentials_comment_credentials_id", fields: ["credentialsId"] },
  ],
})
export class CredentialsComment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Credentials)
  @AllowNull(false)
  @Column(DataType.STRING)
  credentialsId!: string;

  @BelongsTo(() => Credentials, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  credentials?: Credentials;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  authorId!: string;

  @BelongsTo(() => User, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  author?: User;

  @AllowNull(false)
  @Column(DataType.STRING(128))
  authorName!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  comment!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
