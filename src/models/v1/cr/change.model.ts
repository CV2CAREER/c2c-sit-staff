import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_changes" })
export class CRChange extends BaseOptionModel {}