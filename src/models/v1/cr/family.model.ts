import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_families" })
export class CRFamily extends BaseOptionModel {}