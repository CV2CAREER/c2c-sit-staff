import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_providers" })
export class CRProvider extends BaseOptionModel {}