import { Table } from "sequelize-typescript";
import { BaseOptionModel } from "./base-option.model";

@Table({ tableName: "cr_nodes" })
export class CRNode extends BaseOptionModel {}