import { Op } from "sequelize";
import { CECReferralPayout } from "../../models/v1/cec-referral-payout.model";
import { User } from "../../models/v1/user.model";
import { getClientsWithTracker } from "./cec-shared.service";

export class CECReferralPayoutService {
  static async getAll(filters: Record<string, any> = {}) {
    const { search, filter, page = 1, limit = 20 } = filters;
    const where: any = { isDeleted: false };

    if (search) {
      (where as any)[Op.or] = [
        { details: { [Op.iLike]: `%${search}%` } },
        { heritage: { [Op.iLike]: `%${search}%` } },
        { account: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (filter === "noreach") where.outreach = { [Op.and]: [{ [Op.ne]: "Yes" }, { [Op.ne]: "" }, { [Op.not]: null }] };

    const offset = (page - 1) * limit;
    const { rows, count } = await CECReferralPayout.findAndCountAll({
      where,
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return { rows, totalCount: count, page: parseInt(page), limit: parseInt(limit) };
  }

  static async getClientsWithLogs(filters: Record<string, any> = {}) {
    return getClientsWithTracker("referral-payouts", filters);
  }

  static async getById(id: string) {
    const record = await CECReferralPayout.findByPk(id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
    });
    if (!record) throw new Error("Referral payout not found");
    return record;
  }

  static async create(data: Record<string, any>, user: any) {
    return CECReferralPayout.create({ ...data, createdBy: user?.id });
  }

  static async update(id: string, data: Record<string, any>, user: any) {
    const record = await CECReferralPayout.findByPk(id);
    if (!record) throw new Error("Referral payout not found");
    await record.update({ ...data, updatedBy: user?.id });
    return record;
  }

  static async delete(id: string, user: any) {
    const record = await CECReferralPayout.findByPk(id);
    if (!record) throw new Error("Referral payout not found");
    await record.update({ isDeleted: true, deletedBy: user?.id, deletedAt: new Date() });
  }

  static async getStats() {
    const { rows: merged } = await this.getClientsWithLogs({ page: 1, limit: 99999 });
    const payments = merged.filter((r: any) => r.amount).length;
    const totalPaid = merged.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
    const outreachDone = merged.filter((r: any) => r.outreach === "Yes").length;
    const noOutreach = merged.filter((r: any) => r.outreach !== "Yes" && r.outreach !== "" && r.outreach !== null).length;
    return { payments, totalPaid, outreachDone, noOutreach };
  }
}
