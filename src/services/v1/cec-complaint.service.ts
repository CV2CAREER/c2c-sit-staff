import { Op } from "sequelize";
import { CECComplaint } from "../../models/v1/cec-complaint.model";
import { User } from "../../models/v1/user.model";
import { getClientsWithTracker } from "./cec-shared.service";

export class CECComplaintService {
  static async getAll(filters: Record<string, any> = {}) {
    const { search, category, priority, status, owner, filter, page = 1, limit = 20 } = filters;
    const where: any = { isDeleted: false };

    if (search) {
      (where as any)[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { issue: { [Op.iLike]: `%${search}%` } },
        { complaintId: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (owner) where.owner = owner;
    if (filter === "open") where.status = { [Op.and]: [{ [Op.ne]: "Resolved" }, { [Op.ne]: "" }, { [Op.not]: null }] };
    if (filter === "high") where.priority = "High";
    if (filter === "resolved") where.status = "Resolved";

    const offset = (page - 1) * limit;
    const { rows, count } = await CECComplaint.findAndCountAll({
      where,
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return { rows, totalCount: count, page: parseInt(page), limit: parseInt(limit) };
  }

  static async getClientsWithLogs(filters: Record<string, any> = {}) {
    return getClientsWithTracker("complaints", filters);
  }

  static async getById(id: string) {
    const record = await CECComplaint.findByPk(id, {
      include: [{ model: User, as: "creator", attributes: ["id", "firstName", "lastName"] }],
    });
    if (!record) throw new Error("Complaint not found");
    return record;
  }

  static async create(data: Record<string, any>, user: any) {
    return CECComplaint.create({ ...data, createdBy: user?.id });
  }

  static async update(id: string, data: Record<string, any>, user: any) {
    const record = await CECComplaint.findByPk(id);
    if (!record) throw new Error("Complaint not found");
    await record.update({ ...data, updatedBy: user?.id });
    return record;
  }

  static async delete(id: string, user: any) {
    const record = await CECComplaint.findByPk(id);
    if (!record) throw new Error("Complaint not found");
    await record.update({ isDeleted: true, deletedBy: user?.id, deletedAt: new Date() });
  }

  static async getStats() {
    const { rows: merged } = await this.getClientsWithLogs({ page: 1, limit: 99999 });
    const totalLogged = merged.length;
    const open = merged.filter((r: any) => r.status !== "Resolved" && r.status !== "" && r.status !== null).length;
    const highPriority = merged.filter((r: any) => r.priority === "High").length;
    const resolved = merged.filter((r: any) => r.status === "Resolved").length;
    const breached = merged.filter((r: any) => r.status !== "Resolved" && r.status !== "" && r.status !== null && r.age !== null && r.age !== undefined && r.age > 7).length;
    return { totalLogged, open, breached, highPriority, resolved };
  }
}
