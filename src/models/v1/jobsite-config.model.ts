import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

@Table({
  tableName: "jobsite_config",
  timestamps: true,
  indexes: [
    {
      name: "uniq_jobsite_config_jobsite_country",
      unique: true,
      fields: ["jobsite_id", "country"],
    },
  ],
})
export class JobsiteConfig extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: "jobsite_id",
  })
  jobsiteId!: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: "country",
  })
  country!: string;

  @AllowNull(false)
  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: "required",
  })
  required!: boolean;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: "video_guide_url",
  })
  videoGuideUrl?: string | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
