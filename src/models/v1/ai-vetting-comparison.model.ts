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
} from 'sequelize-typescript';

@Table({
  tableName: 'ai_vetting_comparisons',
  timestamps: true,
  indexes: [
    {
      name: 'idx_ai_vetting_comparison_manual_application_id',
      fields: ['manualApplicationId'],
    },
    {
      name: 'idx_ai_vetting_comparison_human_vetted_at',
      fields: ['human_vetted_at'],
    },
  ],
})
export class AiVettingComparison extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.STRING)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  manualApplicationId!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  ai_score?: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  ai_reason?: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  human_score?: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  human_vetted_by?: string | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  human_vetted_at?: Date | null;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  agreement?: boolean | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  classified_at?: Date | null;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
