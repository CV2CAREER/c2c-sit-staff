import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_stages" })
export class CRStage extends BaseOptionModel {}