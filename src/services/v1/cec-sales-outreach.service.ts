import { Op } from "sequelize";
import { CECSalesOutreach } from "../../models/v1/cec-sales-outreach.model";
import { User } from "../../models/v1/user.model";
import { getClientsWithTracker } from "./cec-shared.service";

export class CECSalesOutreachService {
  static async getAll(filters: Record<string, any> = {}) {
    const { search, persona, state, sentiment, filter, page = 1, limit = 20 } = filters;
    const where: any = { isDeleted: false };

    if (search) {
      (where as any)[Op.or] = [
        { persona: { [Op.iLike]: `%${search}%` } },
        { heritage: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (persona) where.persona = persona;
    if (state) where.state = state;
    if (sentiment) where.sentiment = sentiment;

    const offset = (page - 1) * limit;
    const { rows, count } = await CECSalesOutreach.findAndCountAll({
      where,
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return { rows, totalCount: count, page: parseInt(page), limit: parseInt(limit) };
  }

  static async getClientsWithLogs(filters: Record<string, any> = {}) {
    return getClientsWithTracker("sales-outreach", filters);
  }

  static async getById(id: string) {
    const record = await CECSalesOutreach.findByPk(id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
    });
    if (!record) throw new Error("Sales outreach not found");
    return record;
  }

  static async create(data: Record<string, any>, user: any) {
    return CECSalesOutreach.create({ ...data, createdBy: user?.id });
  }

  static async update(id: string, data: Record<string, any>, user: any) {
    const record = await CECSalesOutreach.findByPk(id);
    if (!record) throw new Error("Sales outreach not found");
    await record.update({ ...data, updatedBy: user?.id });
    return record;
  }

  static async delete(id: string, user: any) {
    const record = await CECSalesOutreach.findByPk(id);
    if (!record) throw new Error("Sales outreach not found");
    await record.update({ isDeleted: true, deletedBy: user?.id, deletedAt: new Date() });
  }

  static async getStats() {
    const { rows: merged } = await this.getClientsWithLogs({ page: 1, limit: 99999 });
    const segments = merged.length;
    const reached = merged.filter((r: any) => r.reached && r.reached !== "" && r.reached !== null).length;
    return { segments, reached };
  }
}
