import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Index
} from "sequelize-typescript";

@Table({ tableName: "blogs", timestamps: true })
export class Blog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  slug!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  excerpt!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  content!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true
  })
  author!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true
  })
  featuredImage!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true
  })
  category!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true
  })
  tags!: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false
  })
  isPublished!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false
  })
  recycled!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  publishedAt!: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  viewCount!: number;
}