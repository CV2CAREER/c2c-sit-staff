import { Op } from "sequelize";
import ErrorHandler from "@/utils/errorHandler";
import {
  DropdownOption,
  DROPDOWN_OPTION_LIST_KEYS,
  DropdownOptionListKey,
} from "@/models/v1/dropdown-option.model";
import { getServiceLogger } from "@/utils/createLogger";
import { invalidateDropdownOptionsCache } from "@/services/cache/dropdown-option.cache.service";

const logger = getServiceLogger("dropdown-option-service");

// Manual reorder is infeasible at ~3,350 rows — advertisers are always
// listed alphabetically by label instead, on both the admin list and the
// customer-facing read.
const ALPHABETICAL_LIST_KEYS: DropdownOptionListKey[] = ["advertisers"];

type OptionPayload = {
  label?: string;
  value?: string;
  parentId?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
  sortOrder?: number;
  createdById?: string;
};

type ListOpts = { q?: string; page?: number; limit?: number };

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const validateListKey = (listKey: string): DropdownOptionListKey => {
  if (!DROPDOWN_OPTION_LIST_KEYS.includes(listKey as DropdownOptionListKey)) {
    throw new ErrorHandler(`listKey must be one of: ${DROPDOWN_OPTION_LIST_KEYS.join(", ")}`, 400);
  }
  return listKey as DropdownOptionListKey;
};

const buildTree = (rows: DropdownOption[]) => {
  const byParent = new Map<string | null, DropdownOption[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }
  const attach = (row: DropdownOption): Record<string, unknown> => ({
    ...row.toJSON(),
    children: (byParent.get(row.id) ?? []).map(attach),
  });
  return (byParent.get(null) ?? []).map(attach);
};

export class DropdownOptionService {
  static async listByListKey(listKeyRaw: string, opts: ListOpts = {}) {
    const listKey = validateListKey(listKeyRaw);

    if (ALPHABETICAL_LIST_KEYS.includes(listKey)) {
      const page = Math.max(1, opts.page ?? 1);
      const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
      const where: Record<string, unknown> = { listKey, parentId: null };
      const q = normalize(opts.q);
      if (q) {
        where.label = { [Op.iLike]: `%${q}%` };
      }
      const { rows, count } = await DropdownOption.findAndCountAll({
        where,
        order: [["label", "ASC"]],
        limit,
        offset: (page - 1) * limit,
      });
      return { items: rows, total: count, page, limit };
    }

    const rows = await DropdownOption.findAll({
      where: { listKey },
      order: [
        ["parentId", "ASC"],
        ["sortOrder", "ASC"],
      ],
    });
    return { items: buildTree(rows) };
  }

  static async listDeletedByListKey(listKeyRaw: string) {
    const listKey = validateListKey(listKeyRaw);
    const rows = await DropdownOption.findAll({
      where: { listKey },
      paranoid: false,
      order: [["deletedAt", "DESC"]],
    });
    return rows.filter((r) => r.deletedAt);
  }

  static async getOne(id: string) {
    const row = await DropdownOption.findByPk(id);
    if (!row) throw new ErrorHandler("Option not found", 404);
    return row;
  }

  static async createOption(listKeyRaw: string, payload: OptionPayload) {
    const listKey = validateListKey(listKeyRaw);
    const label = normalize(payload.label);
    const value = normalize(payload.value);
    if (!label) throw new ErrorHandler("label is required", 400);
    if (!value) throw new ErrorHandler("value is required", 400);

    const parentId = payload.parentId || null;
    if (parentId) {
      const parent = await DropdownOption.findOne({ where: { id: parentId, listKey } });
      if (!parent) throw new ErrorHandler("parentId does not reference an option in this listKey", 400);
    }

    const highestOrder = await DropdownOption.max<number, DropdownOption>("sortOrder", {
      where: { listKey, parentId },
    });

    const row = await DropdownOption.create({
      listKey,
      parentId,
      label,
      value,
      metadata: payload.metadata ?? null,
      isActive: payload.isActive ?? true,
      sortOrder: typeof highestOrder === "number" ? highestOrder + 1 : 0,
      createdById: normalize(payload.createdById) || null,
    });

    void invalidateDropdownOptionsCache(listKey);
    logger.info(`Dropdown option created: ${row.id} (${listKey})`);
    return row;
  }

  static async updateOption(id: string, payload: OptionPayload) {
    const row = await DropdownOption.findByPk(id);
    if (!row) throw new ErrorHandler("Option not found", 404);

    const updates: Record<string, unknown> = {};

    if (payload.label !== undefined) {
      const label = normalize(payload.label);
      if (!label) throw new ErrorHandler("label cannot be empty", 400);
      updates.label = label;
    }

    if (payload.value !== undefined) {
      if (row.isSystem) {
        throw new ErrorHandler("This is a system option — its value is fixed and can't be changed", 400);
      }
      const value = normalize(payload.value);
      if (!value) throw new ErrorHandler("value cannot be empty", 400);
      updates.value = value;
    }

    if (payload.metadata !== undefined) {
      updates.metadata = payload.metadata;
    }

    if (payload.isActive !== undefined) {
      updates.isActive = !!payload.isActive;
    }

    if (payload.sortOrder !== undefined) {
      updates.sortOrder = payload.sortOrder;
    }

    await row.update(updates);

    void invalidateDropdownOptionsCache(row.listKey as DropdownOptionListKey);
    logger.info(`Dropdown option updated: ${id}`);
    return row;
  }

  // Soft-deletes the row and (if any) all of its children — an orphaned
  // child left visible under a deleted parent would be a dangling entry no
  // consumer expects.
  static async deleteOption(id: string, deletedById?: string) {
    const row = await DropdownOption.findByPk(id);
    if (!row) throw new ErrorHandler("Option not found", 404);
    if (row.isSystem) {
      throw new ErrorHandler("This is a system option and can't be deleted, only deactivated", 400);
    }

    const children = await DropdownOption.findAll({ where: { parentId: id } });
    for (const child of children) {
      await child.update({ deletedById: deletedById || null });
      await child.destroy();
    }

    await row.update({ deletedById: deletedById || null });
    await row.destroy();

    void invalidateDropdownOptionsCache(row.listKey as DropdownOptionListKey);
    logger.info(`Dropdown option moved to recycle bin: ${id} (+${children.length} child rows)`);
    return { id };
  }

  // Restoring a parent also restores whichever children were soft-deleted
  // alongside it; a child deleted independently while the parent stayed
  // active is restored on its own.
  static async restoreOption(id: string) {
    const row = await DropdownOption.findByPk(id, { paranoid: false });
    if (!row) throw new ErrorHandler("Option not found", 404);
    if (!row.deletedAt) throw new ErrorHandler("Option is not in the recycle bin", 400);

    await row.restore();
    await row.update({ deletedById: null });

    const deletedChildren = await DropdownOption.findAll({
      where: { parentId: id, deletedAt: { [Op.ne]: null } },
      paranoid: false,
    });
    for (const child of deletedChildren) {
      await child.restore();
      await child.update({ deletedById: null });
    }

    void invalidateDropdownOptionsCache(row.listKey as DropdownOptionListKey);
    logger.info(`Dropdown option restored: ${id} (+${deletedChildren.length} child rows)`);
    return row;
  }

  static async hardDeleteOption(id: string) {
    const row = await DropdownOption.findByPk(id, { paranoid: false });
    if (!row) throw new ErrorHandler("Option not found", 404);
    if (!row.deletedAt) {
      throw new ErrorHandler("Move the option to the recycle bin before deleting it permanently", 400);
    }
    if (row.isSystem) throw new ErrorHandler("This is a system option and can't be deleted", 400);

    const listKey = row.listKey as DropdownOptionListKey;
    const children = await DropdownOption.findAll({ where: { parentId: id }, paranoid: false });
    for (const child of children) {
      await child.destroy({ force: true });
    }
    await row.destroy({ force: true });

    void invalidateDropdownOptionsCache(listKey);
    logger.info(`Dropdown option permanently deleted: ${id}`);
    return { id };
  }

  static async reorderOptions(items: { id: string; sortOrder: number; parentId?: string | null }[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorHandler("items must be a non-empty array", 400);
    }

    const rows = await DropdownOption.findAll({ where: { id: items.map((i) => i.id) } });
    if (rows.length === 0) throw new ErrorHandler("No matching options found", 404);
    const listKey = rows[0].listKey as DropdownOptionListKey;

    await Promise.all(
      items.map(({ id, sortOrder, parentId }) => {
        const updates: Record<string, unknown> = { sortOrder };
        if (parentId !== undefined) updates.parentId = parentId || null;
        return DropdownOption.update(updates, { where: { id } });
      }),
    );

    void invalidateDropdownOptionsCache(listKey);
    logger.info(`Reordered ${items.length} dropdown option(s) in listKey=${listKey}`);
    return this.listByListKey(listKey);
  }
}
