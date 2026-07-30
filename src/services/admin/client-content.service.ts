import ErrorHandler from "@/utils/errorHandler";
import {
  ClientContent,
  ClientContentStatus,
  CLIENT_CONTENT_STATUSES,
} from "@/models/v1/client-content.model";
import {
  CLIENT_CONTENT_GROUP_ORDER,
  CLIENT_CONTENT_SEED,
} from "@/constants/client-content.seed";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("client-content-service");

type UpdatePayload = {
  body?: unknown;
  status?: unknown;
};

type Actor = {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null;

const serialize = (section: ClientContent) => ({
  id: section.id,
  key: section.key,
  name: section.name,
  description: section.description,
  placement: section.placement,
  group: section.group,
  body: section.body,
  status: section.status,
  version: section.version,
  updatedAt: section.updatedAt,
  updatedBy: section.updatedBy,
});

const resolveActorName = (actor: Actor) => {
  const fullName = `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim();
  return fullName || actor?.email || "Unknown";
};

/**
 * The editor emits markup such as `<p><br></p>` for an untouched document, so a
 * plain length check on the HTML never reports empty.
 */
const isContentEmpty = (html: string) => {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length === 0 && !/<img\b/i.test(html);
};

const isValidStatus = (value: unknown): value is ClientContentStatus =>
  typeof value === "string" &&
  (CLIENT_CONTENT_STATUSES as readonly string[]).includes(value);

export class ClientContentService {
  /**
   * Creates the table on first boot and writes the starter copy. Existing rows
   * are never overwritten — the business owns the copy once it is live.
   */
  static async ensureClientContentTable() {
    logger.info("Ensuring client_contents table exists");
    await ClientContent.sync({ force: false });

    for (const seed of CLIENT_CONTENT_SEED) {
      const [, created] = await ClientContent.findOrCreate({
        where: { key: seed.key },
        defaults: { ...seed, version: 1, updatedBy: "System" },
      });
      if (created) logger.info(`Seeded client content section: ${seed.key}`);
    }

    logger.info("client_contents table ensured");
  }

  static async listSections() {
    const sections = await ClientContent.findAll();

    // Sort in memory: group order is a presentation concern, not a column.
    const ordered = [...sections].sort((a, b) => {
      const groupDiff =
        CLIENT_CONTENT_GROUP_ORDER.indexOf(a.group) -
        CLIENT_CONTENT_GROUP_ORDER.indexOf(b.group);
      return groupDiff !== 0 ? groupDiff : a.name.localeCompare(b.name);
    });

    logger.info(`Found ${ordered.length} client content sections`);
    return ordered.map(serialize);
  }

  static async getSectionByKey(key: string) {
    const section = await ClientContent.findOne({ where: { key } });
    if (!section) throw new ErrorHandler("Content section not found", 404);
    return serialize(section);
  }

  static async updateSection(id: string, payload: UpdatePayload, actor: Actor) {
    if (!id?.trim()) {
      throw new ErrorHandler("Content section id is required", 400);
    }

    if (typeof payload.body !== "string" || isContentEmpty(payload.body)) {
      throw new ErrorHandler("Content body cannot be empty", 400);
    }

    if (!isValidStatus(payload.status)) {
      throw new ErrorHandler(
        `Status must be one of: ${CLIENT_CONTENT_STATUSES.join(", ")}`,
        400,
      );
    }

    const section = await ClientContent.findByPk(id.trim());
    if (!section) throw new ErrorHandler("Content section not found", 404);

    // Only a copy change earns a new version; toggling draft/published does not.
    const bodyChanged = section.body !== payload.body;

    await section.update({
      body: payload.body,
      status: payload.status,
      version: bodyChanged ? section.version + 1 : section.version,
      updatedBy: resolveActorName(actor),
    });

    logger.info(
      `Updated client content section ${section.key} (v${section.version}, ${section.status}) by ${section.updatedBy}`,
    );
    return serialize(section);
  }
}
