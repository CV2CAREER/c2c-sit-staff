import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_types" })
export class CRType extends BaseOptionModel {}