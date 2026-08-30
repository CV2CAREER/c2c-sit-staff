import { AccessLevel } from "@/models/v1/access-level.model";
import { AccessRule } from "@/models/v1/access-rule.model";
import { UserAccessLevel } from "@/models/v1/user-access-level.model";
import { User } from "@/models/v1/user.model";
import ErrorHandler from "@/utils/errorHandler";
import { SettingService } from "./settings.service";

const serializeRule = (rule: AccessRule) => ({
  _id: rule.id,
  description: rule.description,
  path: rule.path,
  access: rule.access ?? [],
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const serializeAccessLevel = (level: AccessLevel) => ({
  _id: level.id,
  name: level.name,
  description: level.description ?? "",
  personas: level.personas ?? [],
  rules: (level.rules ?? []).map(serializeRule),
  createdAt: level.createdAt,
  updatedAt: level.updatedAt,
});

const serializeUser = (user: User) => ({
  _id: user.id,
  firstName: user.firstName ?? "",
  lastName: user.lastName ?? "",
  email: user.email ?? "",
  role: user.role ?? "",
});

export class AccessLevelService {
  static async getAccessLevels() {
    const levels = await AccessLevel.findAll({
      include: [
        {
          model: AccessRule,
          as: "rules",
          required: false,
        },
      ],
      order: [
        ["createdAt", "ASC"],
        [{ model: AccessRule, as: "rules" }, "createdAt", "ASC"],
      ],
    });

    return levels.map(serializeAccessLevel);
  }

  static async getAllUsers() {
    const users = await User.findAll({
      where: { deletedAt: null },
      attributes: ["id", "firstName", "lastName", "email", "role"],
      order: [["createdAt", "DESC"]],
    });

    return users.map(serializeUser);
  }

  static async getUsersByAccessLevel(accessLevelId: string) {
    const mappings = await UserAccessLevel.findAll({
      where: { accessLevelId },
      include: [
        {
          model: User,
          as: "user",
          required: true,
          attributes: ["id", "firstName", "lastName", "email", "role", "deletedAt"],
          where: { deletedAt: null },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return mappings
      .map((mapping) => mapping.user)
      .filter((user): user is User => Boolean(user))
      .map(serializeUser);
  }

  static async getUserAccessLevels(userId: string) {
    const mappings = await UserAccessLevel.findAll({
      where: { userId },
      include: [
        {
          model: AccessLevel,
          as: "accessLevel",
          include: [{ model: AccessRule, as: "rules", required: false }],
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return mappings
      .map((mapping) => mapping.accessLevel)
      .filter((level): level is AccessLevel => Boolean(level))
      .map(serializeAccessLevel);
  }

  static async updateUserAccess(
    action: "add" | "remove",
    payload: { userId: string; accessLevel: string },
  ) {
    const { userId, accessLevel } = payload;

    if (!userId || !accessLevel) {
      throw new ErrorHandler("userId and accessLevel are required", 400);
    }

    const [user, level] = await Promise.all([
      User.findByPk(userId),
      AccessLevel.findByPk(accessLevel),
    ]);

    if (!user || user.deletedAt) {
      throw new ErrorHandler("User not found", 404);
    }

    if (!level) {
      throw new ErrorHandler("Access level not found", 404);
    }

    if (action === "add") {
      await UserAccessLevel.findOrCreate({
        where: { userId, accessLevelId: accessLevel },
        defaults: { userId, accessLevelId: accessLevel },
      });
      return { success: true };
    }

    await UserAccessLevel.destroy({
      where: { userId, accessLevelId: accessLevel },
    });
    return { success: true };
  }

  static async createRule(payload: {
    accessLevel: string;
    description: string;
    path: string;
    access: string[];
  }) {
    const accessLevel = await AccessLevel.findByPk(payload.accessLevel);
    if (!accessLevel) {
      throw new ErrorHandler("Access level not found", 404);
    }

    if (!payload.description?.trim() || !payload.path?.trim()) {
      throw new ErrorHandler("description and path are required", 400);
    }

    const accessList = Array.isArray(payload.access)
      ? payload.access.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [];

    if (accessList.length === 0) {
      throw new ErrorHandler("access must contain at least one value", 400);
    }

    const rule = await AccessRule.create({
      accessLevelId: payload.accessLevel,
      description: payload.description.trim(),
      path: payload.path.trim(),
      access: accessList,
    });

    return serializeRule(rule);
  }

  static async updateRule(
    id: string,
    payload: { description: string; path: string; access: string[] },
  ) {
    const rule = await AccessRule.findByPk(id);
    if (!rule) {
      throw new ErrorHandler("Rule not found", 404);
    }

    const accessList = Array.isArray(payload.access)
      ? payload.access.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [];

    if (!payload.description?.trim() || !payload.path?.trim()) {
      throw new ErrorHandler("description and path are required", 400);
    }

    if (accessList.length === 0) {
      throw new ErrorHandler("access must contain at least one value", 400);
    }

    await rule.update({
      description: payload.description.trim(),
      path: payload.path.trim(),
      access: accessList,
    });

    return serializeRule(rule);
  }

  static async deleteRule(id: string) {
    const deletedCount = await AccessRule.destroy({ where: { id } });
    if (!deletedCount) {
      throw new ErrorHandler("Rule not found", 404);
    }
    return { success: true };
  }

  static async getMasterPasswordInfo() {
    return SettingService.getMasterPassword();
  }

  static async updateMasterPassword(
    req: any,
    payload: { oldPassword: string; newPassword: string },
    user: any,
  ) {
    return SettingService.updateMasterPassword(
      req,
      payload.oldPassword,
      payload.newPassword,
      user,
    );
  }

  static async ensureAccessLevelTablesAndSeed() {
    await AccessLevel.sync({ force: false });
    await AccessRule.sync({ force: false });
    await UserAccessLevel.sync({ force: false });

    const currentCount = await AccessLevel.count();
    if (currentCount > 0) {
      return;
    }

    await AccessLevel.bulkCreate([
      {
        name: "Manager",
        description: "Full administrative oversight across staff operations.",
        personas: ["admin"],
      },
      {
        name: "Assistant",
        description: "Operational access for assistant workflows.",
        personas: ["assistant"],
      },
      {
        name: "Technology",
        description: "Access for technology and engineering operations.",
        personas: ["technology"],
      },
      {
        name: "Business",
        description: "Access for business operations and reporting.",
        personas: ["business"],
      },
    ]);
  }
}
