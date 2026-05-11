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
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
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