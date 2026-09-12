import { Op } from "sequelize";
import { CECDailyLog } from "../../models/v1/cec-daily-log.model";
import { User } from "../../models/v1/user.model";
import { getClientsWithTracker } from "./cec-shared.service";

export class CECDailyLogService {
  static async getAll(filters: Record<string, any> = {}) {
    const { search, status, loyalty, callEstablished, sentimentBefore, sentimentAfter, survey, referral, filter, page = 1, limit = 20 } = filters;
    const where: any = { isDeleted: false };

    if (search) {
      (where as any)[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { customerId: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (status) where.status = status;
    if (loyalty) where.loyalty = loyalty;
    if (callEstablished) where.callEstablished = callEstablished;
    if (sentimentBefore) where.sentimentBefore = sentimentBefore;
    if (sentimentAfter) where.sentimentAfter = sentimentAfter;
    if (survey) where.survey = survey;
    if (referral) where.referral = referral;

    if (filter === "critical") where.sentimentBefore = "Critical";
    if (filter === "nocall") where.callEstablished = { [Op.ne]: "Yes" };
    if (filter === "nosurvey") where.survey = { [Op.or]: [{ [Op.eq]: "" }, { [Op.eq]: "No" }, { [Op.is]: null }] };
    if (filter === "migrated") where.migration = { [Op.like]: `% to %` };

    const offset = (page - 1) * limit;
    const { rows, count } = await CECDailyLog.findAndCountAll({
      where,
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return { rows, totalCount: count, page: parseInt(page), limit: parseInt(limit) };
  }

  static async getClientsWithLogs(filters: Record<string, any> = {}) {
    return getClientsWithTracker("daily-log", filters);
  }

  static async getById(id: string) {
    const record = await CECDailyLog.findByPk(id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
    });
    if (!record) throw new Error("Daily log not found");
    return record;
  }

  static async create(data: Record<string, any>, user: any) {
    return CECDailyLog.create({ ...data, createdBy: user?.id });
  }

  static async update(id: string, data: Record<string, any>, user: any) {
    const record = await CECDailyLog.findByPk(id);
    if (!record) throw new Error("Daily log not found");
    await record.update({ ...data, updatedBy: user?.id });
    return record;
  }

  static async delete(id: string, user: any) {
    const record = await CECDailyLog.findByPk(id);
    if (!record) throw new Error("Daily log not found");
    await record.update({ isDeleted: true, deletedBy: user?.id, deletedAt: new Date() });
  }

  static async getStats() {
    const { rows: merged } = await this.getClientsWithLogs({ page: 1, limit: 99999 });
    const total = merged.length;
    const callsLogged = merged.filter((r: any) => r.callEstablished === "Yes").length;
    const critical = merged.filter((r: any) => r.sentimentBefore === "Critical").length;
    const validatedMigrations = merged.filter((r: any) => r.migration && r.migration.includes(" to ")).length;
    const surveyIn5mins = merged.filter((r: any) => r.survey === "Yes-5mins").length;
    return { total, callsLogged, critical, validatedMigrations, surveyIn5mins };
  }
}
