import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  AllowNull,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import { v4 as uuidv4 } from "uuid";

@Table({
  tableName: "slack_messages",
  timestamps: true,
  indexes: [
    {
      fields: ["createdAt"],
    }
  ],
})
export class SlackMessage extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  message?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  variables?: any[];

  @AllowNull(true)
  @Column(DataType.STRING)
  category?: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  attachments?: any;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  isActive?: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}

export default SlackMessage;