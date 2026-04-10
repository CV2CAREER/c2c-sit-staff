import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_severities" })
export class CRSeverity extends BaseOptionModel {}