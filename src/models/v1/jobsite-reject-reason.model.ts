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

export const DEFAULT_JOBSITE_REJECT_REASONS = [
  { reason: "Delegation not granted", displayOrder: 1 },
  { reason: "Mailbox not reachable", displayOrder: 2 },
  { reason: "2FA blocking delegated access", displayOrder: 3 },
  { reason: "Email rejected by jobsite", displayOrder: 4 },
  { reason: "Email already in use", displayOrder: 5 },
  { reason: "Invalid screenshot / proof file", displayOrder: 6 },
  { reason: "Profile details mismatch", displayOrder: 7 },
  { reason: "Jobsite account not activated", displayOrder: 8 },
];

@Table({
  tableName: "jobsite_reject_reasons",
  timestamps: true,
})
export class JobsiteRejectReason extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    field: "reason",
  })
  reason!: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    field: "description",
  })
  description?: string | null;

  @AllowNull(false)
  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: "is_active",
  })
  isActive!: boolean;

  @AllowNull(false)
  @Default(0)
  @Column({
    type: DataType.INTEGER,
    field: "display_order",
  })
  displayOrder!: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
