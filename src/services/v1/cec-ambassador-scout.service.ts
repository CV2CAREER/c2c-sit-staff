import { Op } from "sequelize";
import { CECAmbassadorScout } from "../../models/v1/cec-ambassador-scout.model";
import { User } from "../../models/v1/user.model";
import { getClientsWithTracker } from "./cec-shared.service";

export class CECAmbassadorScoutService {
  static async getAll(filters: Record<string, any> = {}) {
    const { search, filter, page = 1, limit = 20 } = filters;
    const where: any = { isDeleted: false };

    if (search) {
      (where as any)[Op.or] = [
        { country: { [Op.iLike]: `%${search}%` } },
        { pipeline: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;
    const { rows, count } = await CECAmbassadorScout.findAndCountAll({
      where,
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return { rows, totalCount: count, page: parseInt(page), limit: parseInt(limit) };
  }

  static async getClientsWithLogs(filters: Record<string, any> = {}) {
    return getClientsWithTracker("ambassador-scouting", filters);
  }

  static async getById(id: string) {
    const record = await CECAmbassadorScout.findByPk(id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
    });
    if (!record) throw new Error("Ambassador scout not found");
    return record;
  }

  static async create(data: Record<string, any>, user: any) {
    return CECAmbassadorScout.create({ ...data, createdBy: user?.id });
  }

  static async update(id: string, data: Record<string, any>, user: any) {
    const record = await CECAmbassadorScout.findByPk(id);
    if (!record) throw new Error("Ambassador scout not found");
    await record.update({ ...data, updatedBy: user?.id });
    return record;
  }

  static async delete(id: string, user: any) {
    const record = await CECAmbassadorScout.findByPk(id);
    if (!record) throw new Error("Ambassador scout not found");
    await record.update({ isDeleted: true, deletedBy: user?.id, deletedAt: new Date() });
  }

  static async getStats() {
    const { rows: merged } = await this.getClientsWithLogs({ page: 1, limit: 99999 });
    // Distinct countries being worked — not the row count (several rows can share
    // a country as candidates move through the pipeline).
    const countrySet = new Set<string>();
    for (const r of merged) {
      const c = String((r as any).country || "").trim().toLowerCase();
      if (c) countrySet.add(c);
    }
    const countries = countrySet.size;
    const nominations = merged.filter((r: any) => r.nominations && r.nominations !== "" && r.nominations !== null).length;
    return { countries, nominations };
  }
}
