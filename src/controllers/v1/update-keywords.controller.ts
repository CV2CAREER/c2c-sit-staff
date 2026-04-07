// controllers/v1/update-keywords.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { toTitleCase } from "@/utils/helpers";

export const updateKeywordsController = async (req: Request, res: Response) => {
  try {
    const { newData } = req.body;

    if (!newData) {
      return res.status(400).json({ message: "newData was not sent" });
    }

    const masterCredId = newData?.clientId;
    const table = newData.table.toLowerCase();
    const isSecondary = newData.isSecondary;

    const controller = new UpdateKeywordSheetController();

    await controller.updateTitles(masterCredId, table, isSecondary);
    await controller.updateTitlesExcluded(masterCredId, table, isSecondary);

    return res.status(200).json({ message: "Keywords updated successfully" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

class UpdateKeywordSheetController {
  async updateTitles(
    masterCredId: string,
    table: string,
    isSecondary?: boolean,
  ): Promise<void> {
    const customerId = isSecondary
      ? await this.getSecondaryCustomerId(masterCredId)
      : await this.getCustomerId(masterCredId);

    const profile = isSecondary
      ? await this.getSecondaryProfile(customerId)
      : await this.getUserProfile(customerId);

    const { titles, keywords, country, minSalary, maxSalary } = profile;

    const titleAndKeys = [...(keywords || []), ...(titles || [])];

    if (!titleAndKeys.length) return;

    const model = modelFromDb(table);

    await this.updateTitlesInDB(
      model,
      masterCredId,
      titleAndKeys,
      country,
      minSalary,
      maxSalary,
    );
  }

  async updateTitlesExcluded(
    masterCredId: string,
    table: string,
    isSecondary: boolean,
  ): Promise<void> {
    const customerId = isSecondary
      ? await this.getSecondaryCustomerId(masterCredId)
      : await this.getCustomerId(masterCredId);

    const profile = isSecondary
      ? await this.getSecondaryProfile(customerId)
      : await this.getUserProfile(customerId);

    const { titlesExcluded, keywordsExcluded } = profile;

    const titlesExcludedAndKeysExcluded = [
      ...(titlesExcluded || []),
      ...(keywordsExcluded || []),
    ];

    if (!titlesExcludedAndKeysExcluded.length) return;

    const model = modelFromDb(table);

    await this.updateTitlesExcludedInDB(
      model,
      masterCredId,
      titlesExcludedAndKeysExcluded,
    );
  }

  async getCustomerId(masterCredId: string): Promise<string> {
    const customer = await db.credentials.findUnique({
      where: { id: masterCredId },
      select: { customer_id: true },
    });

    if (!customer) throw new Error("Customer ID not found");

    return customer.customer_id;
  }

  async getSecondaryCustomerId(masterCredId: string): Promise<string> {
    const realId = masterCredId.replace("00636", "");
    return this.getCustomerId(realId);
  }

  async getUserProfile(customerId: string): Promise<any> {
    const user = await db.users.findUnique({
      where: { unique_id: customerId },
    });

    if (!user) throw new Error("User not found");

    const profile = await db.profiles.findUnique({
      where: { id: user.profile_id },
    });

    if (!profile) throw new Error("User does not have a profile");

    if (!profile.country) {
      profile.country = user.country;
    }

    return profile;
  }

  async getSecondaryProfile(customerId: string): Promise<any> {
    const user = await db.users.findUnique({
      where: { unique_id: customerId },
    });

    if (!user) throw new Error("User not found");

    const profile = await db.profiles.findUnique({
      where: { id: user.secondary_profile_id },
    });

    if (!profile) throw new Error("User does not have a secondary profile");

    return profile;
  }

  async updateTitlesInDB(
    dbTable: any,
    newId: string,
    titles: string[],
    country: string,
    minSalary: number,
    maxSalary: number,
  ): Promise<void> {
    for (const keyword of titles) {
      if (!keyword.trim()) continue;

      const titledKeyword = toTitleCase(keyword);

      const record: any = {
        master_credential_id: newId,
        title_include: titledKeyword.replace(/ /g, "; "),
        country,
        is_deleted: false,
      };

      if (["seek", "jobserve", "linkedin"].includes(dbTable._name)) {
        record.min = minSalary;
        record.max = maxSalary;
        record.keyword = titledKeyword;
      } else {
        record.salary_min = minSalary;
        record.salary_max = maxSalary;
        record.all_words = titledKeyword;
      }

      await dbTable.create({
        data: record,
      });
    }
  }

  async updateTitlesExcludedInDB(
    dbTable: any,
    newId: string,
    titlesExcluded: string[],
  ): Promise<void> {
    const newRecord = {
      is_deleted: false,
      title_exclude: titlesExcluded.map((k) => toTitleCase(k)).join("; "),
    };

    await dbTable.updateMany({
      where: { master_credential_id: newId },
      data: newRecord,
    });
  }
}

const modelFromDb = (model: string) => {
  if (!(model in db)) {
    throw new Error(`Invalid model requested: ${model}`);
  }
  return (db as any)[model];
};
