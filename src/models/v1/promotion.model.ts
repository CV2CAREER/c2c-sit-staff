import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Index
} from "sequelize-typescript";

@Table({ tableName: "promotions", timestamps: true })
export class Promotion extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Index
  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    unique: true
  })
  country!: string;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  expiryDate!: Date;

  @Column({
    type: DataType.STRING(10),
    allowNull: true
  })
  countryCode!: string;

  @Index
  @Column({
    type: DataType.STRING(100),
    allowNull: true
  })
  promotionCode!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    allowNull: false
  })
  isActive!: boolean;

  @Column({
    type: DataType.ENUM('CODE', 'COUNTRY'),
    defaultValue: 'CODE',
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  discountPercentage!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  maxUsage!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  usageCount!: number;
}

@Table({ tableName: "promotion_lengths", timestamps: true })
export class PromotionLength extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Duration in days'
  })
  duration!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;
}