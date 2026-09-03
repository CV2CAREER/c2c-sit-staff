import { Op } from "sequelize";
import { CECIssueBurndown } from "../../models/v1/cec-issue-burndown.model";
import { User } from "../../models/v1/user.model";
import { getClientsWithTracker } from "./cec-shared.service";

export class CECIssueBurndownService {
  static async getAll(filters: Record<string, any> = {}) {
    const { search, filter, page = 1, limit = 20 } = filters;
    const where: any = { isDeleted: false };

    if (search) {
      (where as any)[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (filter === "otp") where.otp = { [Op.and]: [{ [Op.ne]: "" }, { [Op.ne]: "No Issue" }, { [Op.not]: null }] };
    if (filter === "unverified") where.verification = "Not Verified";
    if (filter === "nocv") where.cv = "Not yet uploaded";
    if (filter === "open") where.resolution = { [Op.and]: [{ [Op.ne]: "Resolved" }, { [Op.ne]: "" }, { [Op.not]: null }] };

    const offset = (page - 1) * limit;
    const { rows, count } = await CECIssueBurndown.findAndCountAll({
      where,
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return { rows, totalCount: count, page: parseInt(page), limit: parseInt(limit) };
  }

  static async getClientsWithLogs(filters: Record<string, any> = {}) {
    return getClientsWithTracker("issue-burndown", filters);
  }

  static async getById(id: string) {
    const record = await CECIssueBurndown.findByPk(id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
    });
    if (!record) throw new Error("Issue burndown not found");
    return record;
  }

  static async create(data: Record<string, any>, user: any) {
    return CECIssueBurndown.create({ ...data, createdBy: user?.id });
  }

  static async update(id: string, data: Record<string, any>, user: any) {
    const record = await CECIssueBurndown.findByPk(id);
    if (!record) throw new Error("Issue burndown not found");
    await record.update({ ...data, updatedBy: user?.id });
    return record;
  }

  static async delete(id: string, user: any) {
    const record = await CECIssueBurndown.findByPk(id);
    if (!record) throw new Error("Issue burndown not found");
    await record.update({ isDeleted: true, deletedBy: user?.id, deletedAt: new Date() });
  }

  static async getStats() {
    const { rows: merged } = await this.getClientsWithLogs({ page: 1, limit: 99999 });
    const total = merged.length;
    const otpIssues = merged.filter((r: any) => r.otp && r.otp !== "No Issue" && r.otp !== "" && r.otp !== null).length;
    const notVerified = merged.filter((r: any) => r.verification === "Not Verified").length;
    const cvMissing = merged.filter((r: any) => r.cv === "Not yet uploaded").length;
    const clean = merged.filter((r: any) => r.otp === "No Issue" && r.verification === "Verified" && r.cv === "Uploaded").length;
    return { total, otpIssues, notVerified, cvMissing, clean };
  }
}
