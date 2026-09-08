import { UserSegmentFilter } from "../../models/v1/user-segment-filter.model";
import ErrorHandler from "../../utils/errorHandler";

export interface SegmentRow {
  id: string;
  name: string;
  filters: Record<string, string | null>;
  createdAt: string;
}

const toRow = (row: UserSegmentFilter): SegmentRow => ({
  id: row.id,
  name: row.name,
  filters: row.filters,
  createdAt: row.createdAt.toISOString(),
});

class UserSegmentFilterService {
  async list(userId: string): Promise<SegmentRow[]> {
    const rows = await UserSegmentFilter.findAll({
      where: { userId },
      order: [["createdAt", "ASC"]],
    });

    return rows.map(toRow);
  }

  async create(
    userId: string,
    name: string,
    filters: Record<string, string | null>,
  ): Promise<SegmentRow> {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      throw new ErrorHandler("Segment name is required.", 400);
    }

    const row = await UserSegmentFilter.create({
      userId,
      name: trimmed,
      filters,
    } as any);

    return toRow(row);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const deleted = await UserSegmentFilter.destroy({ where: { id, userId } });
    return deleted > 0;
  }
}

export const userSegmentFilterService = new UserSegmentFilterService();
