import { Table, Column, DataType, AllowNull } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_owners" })
export class CROwner extends BaseOptionModel {
  @AllowNull(true)
  @Column(DataType.STRING)
  email?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  slackId?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  role?: string;
}