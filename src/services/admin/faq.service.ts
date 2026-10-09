import { fn, col, where as sqlWhere } from "sequelize";
import ErrorHandler from "@/utils/errorHandler";
import { FaqCategory } from "@/models/v1/faq-category.model";
import { FaqArticle, FaqArticleStatus } from "@/models/v1/faq-article.model";
import { FAQ_ARTICLE_SEED, FAQ_CATEGORY_SEED } from "@/constants/faq.seed";
import { getServiceLogger } from "@/utils/createLogger";
import { SlackService } from "@/services/slack.service";
import { getDefaultHost, getEnvironmentFromHost } from "@/utils/slack-helpers";
import { getFrontendUrl } from "@/utils/helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "@/utils/enum";

const logger = getServiceLogger("faq-service");

/** FAQ category that holds the reusable selection-criteria answer bank. */
export const SELECTION_CRITERIA_CATEGORY = "Selection Criteria Questions";

/** Case/punctuation-insensitive key so "Describe your…?" matches "describe your…". */
export const normalizeQuestion = (question: string) =>
  question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Actor = {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null;

type ArticlePayload = {
  question?: unknown;
  answer?: unknown;
  categoryId?: unknown;
  status?: unknown;
  botAnswerable?: unknown;
  displayOrder?: unknown;
};

/**
 * Authors can only save a draft or send for review. Publishing happens in the
 * Review Queue (approveArticle) so nothing reaches a client — or the chatbot —
 * without passing through review.
 */
const AUTHOR_STATUSES: FaqArticleStatus[] = ["draft", "in_review"];

const resolveActorName = (actor: Actor) => {
  const fullName = `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim();
  return fullName || actor?.email || "Unknown";
};

const serializeArticle = (article: FaqArticle) => ({
  id: article.id,
  code: article.code,
  question: article.question,
  answer: article.answer,
  categoryId: article.categoryId,
  categoryName: article.category?.name ?? null,
  status: article.status,
  botAnswerable: article.botAnswerable,
  displayOrder: article.displayOrder,
  viewCount: article.viewCount ?? 0,
  updatedBy: article.updatedBy,
  updatedAt: article.updatedAt,
  publishedBy: article.publishedBy ?? null,
  publishedAt: article.publishedAt ?? null,
  createdAt: article.createdAt,
});

const requireText = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorHandler(`${label} is required`, 400);
  }
  return value.trim();
};

const parseDisplayOrder = (value: unknown) => {
  if (value === undefined || value === null || value === "") return 0;
  const order = Number(value);
  if (!Number.isInteger(order) || order < 0) {
    throw new ErrorHandler("Display order must be a whole number of 0 or more", 400);
  }
  return order;
};

const parseAuthorStatus = (value: unknown): FaqArticleStatus => {
  if (value === "published") {
    throw new ErrorHandler(
      "Articles are published from the Review Queue, not from the form",
      400,
    );
  }
  if (!AUTHOR_STATUSES.includes(value as FaqArticleStatus)) {
    throw new ErrorHandler(`Status must be one of: ${AUTHOR_STATUSES.join(", ")}`, 400);
  }
  return value as FaqArticleStatus;
};

const findArticleOrThrow = async (id: string) => {
  const article = await FaqArticle.findByPk(id?.trim(), {
    include: [{ model: FaqCategory, attributes: ["id", "name"] }],
  });
  if (!article) throw new ErrorHandler("FAQ article not found", 404);
  return article;
};

/**
 * Tell Slack that FAQ articles have landed in the Review Queue (anything not
 * published). Fire-and-forget — a Slack outage must never block FAQ authoring.
 */
const notifyReviewQueue = (
  articles: { code: string; question: string; status: string }[],
  context: { headline: string; actor: string; byBot?: boolean },
) => {
  if (!articles.length) return;
  const host = getDefaultHost();
  const list = articles
    .map((a) => `• *${a.code}* (${a.status === "in_review" ? "In review" : "Draft"}) — ${a.question}`)
    .join("\n");
  const body =
    `📚 FAQ REVIEW QUEUE — ${context.headline}\n` +
    `• *By:* ${context.actor}\n` +
    `${list}\n` +
    `<${getFrontendUrl()}/admin/communication/faq|Open the Review Queue>`;

  setImmediate(() => {
    void SlackService.notify({
      location: getEnvironmentFromHost(host),
      host,
      node: SlackNode.MESSAGING,
      provider: SlackProvider.SYSTEM,
      severity: SlackSeverity.INFO,
      type: context.byBot ? SlackEventType.SYSTEM_NOTIFICATION : SlackEventType.ADMIN_ACTION,
      trigger: context.actor,
      channel: SlackChannel.TOWN_CRIER,
      teamMentions: "CSM",
      body,
    });
  });
};

// FAQ-001, FAQ-002 … counted across soft-deleted rows so a code is never reused.
const nextArticleCode = async () => {
  const total = await FaqArticle.count({ paranoid: false });
  return `FAQ-${String(total + 1).padStart(3, "0")}`;
};

export class FaqService {
  /** Writes the starting taxonomy once, only while the table is empty. */
  static async seedDefaultCategories() {
    if ((await FaqCategory.count()) > 0) return;
    await FaqCategory.bulkCreate(FAQ_CATEGORY_SEED);
    logger.info(`Seeded ${FAQ_CATEGORY_SEED.length} FAQ categories`);
  }

  /**
   * Migrates the FAQs that used to be hardcoded on the public /faq page.
   * Matched by question, including soft-deleted rows, so an article an admin
   * has since edited or deleted is never re-created.
   */
  static async seedWebsiteArticles() {
    const existing = await FaqArticle.findAll({ attributes: ["question"], paranoid: false });
    const known = new Set(existing.map((a) => normalizeQuestion(a.question)));

    const categories = await FaqCategory.findAll();
    const categoryId = (name: string) =>
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;

    let created = 0;
    for (const seed of FAQ_ARTICLE_SEED) {
      if (known.has(normalizeQuestion(seed.question))) continue;
      const id = categoryId(seed.category);
      if (!id) {
        logger.warn(`FAQ seed skipped "${seed.question}" — category "${seed.category}" not found`);
        continue;
      }
      await FaqArticle.create({
        code: await nextArticleCode(),
        question: seed.question,
        answer: seed.answer,
        categoryId: id,
        status: "published",
        botAnswerable: true,
        displayOrder: seed.displayOrder,
        updatedBy: "System",
        publishedBy: "System (migrated from website)",
        publishedAt: new Date(),
      });
      created++;
    }
    if (created) logger.info(`Seeded ${created} FAQ article(s) from the website`);
  }

  /* ---------------- Categories ---------------- */

  static async listCategories() {
    const [categories, articles] = await Promise.all([
      FaqCategory.findAll({ order: [["displayOrder", "ASC"], ["name", "ASC"]] }),
      FaqArticle.findAll({ attributes: ["categoryId", "status"] }),
    ]);

    return categories.map((category) => {
      const inCategory = articles.filter((a) => a.categoryId === category.id);
      return {
        id: category.id,
        name: category.name,
        displayOrder: category.displayOrder,
        articleCount: inCategory.length,
        publishedCount: inCategory.filter((a) => a.status === "published").length,
      };
    });
  }

  static async createCategory(payload: { name?: unknown }) {
    const name = requireText(payload.name, "Category name");

    // Case-insensitive, so "payments" can't sit beside "Payments".
    const existing = await FaqCategory.findOne({
      where: sqlWhere(fn("lower", col("name")), name.toLowerCase()),
    });
    if (existing) {
      throw new ErrorHandler(`A category named "${existing.name}" already exists`, 409);
    }

    const last = await FaqCategory.max<number, FaqCategory>("displayOrder");
    const category = await FaqCategory.create({
      name,
      displayOrder: (Number(last) || 0) + 1,
    });
    logger.info(`Created FAQ category: ${category.name}`);
    return { ...category.toJSON(), articleCount: 0, publishedCount: 0 };
  }

  /* ---------------- Articles ---------------- */

  static async listArticles() {
    const articles = await FaqArticle.findAll({
      include: [{ model: FaqCategory, attributes: ["id", "name", "displayOrder"] }],
      order: [
        [{ model: FaqCategory, as: "category" }, "displayOrder", "ASC"],
        ["displayOrder", "ASC"],
        ["createdAt", "ASC"],
      ],
    });
    return articles.map(serializeArticle);
  }

  static async createArticle(payload: ArticlePayload, actor: Actor) {
    const question = requireText(payload.question, "Question");
    const answer = requireText(payload.answer, "Answer");
    const categoryId = requireText(payload.categoryId, "Category");
    const status = parseAuthorStatus(payload.status ?? "draft");

    if (!(await FaqCategory.findByPk(categoryId))) {
      throw new ErrorHandler("Choose a category from the list", 400);
    }

    const article = await FaqArticle.create({
      code: await nextArticleCode(),
      question,
      answer,
      categoryId,
      status,
      botAnswerable: payload.botAnswerable !== false,
      displayOrder: parseDisplayOrder(payload.displayOrder),
      updatedBy: resolveActorName(actor),
    });

    logger.info(`Created FAQ ${article.code} (${status}) by ${article.updatedBy}`);
    notifyReviewQueue([article], { headline: "New FAQ added", actor: article.updatedBy });
    return serializeArticle(await findArticleOrThrow(article.id));
  }

  /**
   * Editing a published article takes it offline until it is approved again —
   * a changed answer is a new public commitment and goes back through review.
   */
  static async updateArticle(id: string, payload: ArticlePayload, actor: Actor) {
    const article = await findArticleOrThrow(id);

    const question = requireText(payload.question, "Question");
    const answer = requireText(payload.answer, "Answer");
    const categoryId = requireText(payload.categoryId, "Category");
    const status = parseAuthorStatus(payload.status ?? "draft");

    if (!(await FaqCategory.findByPk(categoryId))) {
      throw new ErrorHandler("Choose a category from the list", 400);
    }

    const wasPublished = article.status === "published";
    await article.update({
      question,
      answer,
      categoryId,
      status,
      botAnswerable: payload.botAnswerable !== false,
      displayOrder: parseDisplayOrder(payload.displayOrder),
      updatedBy: resolveActorName(actor),
    });

    logger.info(
      `Updated FAQ ${article.code} → ${status}${wasPublished ? " (was published, now offline)" : ""} by ${article.updatedBy}`,
    );
    if (wasPublished) {
      notifyReviewQueue([article], {
        headline: "Published FAQ edited — offline until re-approved",
        actor: article.updatedBy,
      });
    }
    return serializeArticle(await findArticleOrThrow(article.id));
  }

  static async submitForReview(id: string, actor: Actor) {
    const article = await findArticleOrThrow(id);
    if (article.status !== "draft") {
      throw new ErrorHandler("Only drafts can be sent for review", 400);
    }
    await article.update({ status: "in_review", updatedBy: resolveActorName(actor) });
    logger.info(`FAQ ${article.code} sent for review by ${article.updatedBy}`);
    return serializeArticle(article);
  }

  static async approveArticle(id: string, actor: Actor) {
    const article = await findArticleOrThrow(id);
    if (article.status !== "in_review") {
      throw new ErrorHandler("Only articles in review can be approved", 400);
    }
    // Selection-criteria drafts arrive with the question only.
    if (!article.answer?.trim()) {
      throw new ErrorHandler("Add an answer before publishing this FAQ", 400);
    }
    const name = resolveActorName(actor);
    await article.update({
      status: "published",
      updatedBy: name,
      publishedBy: name,
      publishedAt: new Date(),
    });
    logger.info(`FAQ ${article.code} approved and published by ${name}`);
    return serializeArticle(article);
  }

  static async returnToDraft(id: string, actor: Actor) {
    const article = await findArticleOrThrow(id);
    if (article.status !== "in_review") {
      throw new ErrorHandler("Only articles in review can be sent back to draft", 400);
    }
    await article.update({ status: "draft", updatedBy: resolveActorName(actor) });
    logger.info(`FAQ ${article.code} sent back to draft by ${article.updatedBy}`);
    return serializeArticle(article);
  }

  /* ---------------- Selection Criteria Questions bank ---------------- */

  private static async ensureSelectionCriteriaCategory() {
    const existing = await FaqCategory.findOne({
      where: sqlWhere(fn("lower", col("name")), SELECTION_CRITERIA_CATEGORY.toLowerCase()),
    });
    if (existing) return existing;
    const last = await FaqCategory.max<number, FaqCategory>("displayOrder");
    return FaqCategory.create({
      name: SELECTION_CRITERIA_CATEGORY,
      displayOrder: (Number(last) || 0) + 1,
    });
  }

  /**
   * Looks each selection-criteria question up in the bank (the "Selection
   * Criteria Questions" FAQ category):
   *  - matched: a published article — its answer is the best-in-class draft
   *  - pending: already in the bank but not yet published (no duplicate made)
   *  - new:     not in the bank — added as a Draft for an admin to answer
   * New drafts are never bot-answerable; they are staff material.
   */
  static async lookupSelectionCriteria(questions: string[], requestedBy: string) {
    const category = await this.ensureSelectionCriteriaCategory();
    const articles = await FaqArticle.findAll({ where: { categoryId: category.id } });
    const byQuestion = new Map(articles.map((a) => [normalizeQuestion(a.question), a]));

    const results = new Map<
      string,
      { status: "matched" | "pending" | "new"; code: string; answer: string | null }
    >();
    const newDrafts: FaqArticle[] = [];

    for (const question of questions) {
      const key = normalizeQuestion(question);
      if (results.has(key)) continue;

      const found = byQuestion.get(key);
      if (found) {
        results.set(key, {
          status: found.status === "published" && found.answer?.trim() ? "matched" : "pending",
          code: found.code,
          answer: found.status === "published" ? found.answer : null,
        });
        continue;
      }

      const draft = await FaqArticle.create({
        code: await nextArticleCode(),
        question: question.trim(),
        answer: "",
        categoryId: category.id,
        status: "draft",
        botAnswerable: false,
        displayOrder: 0,
        updatedBy: `Selection Criteria Assistant (for ${requestedBy})`,
      });
      byQuestion.set(key, draft);
      newDrafts.push(draft);
      results.set(key, { status: "new", code: draft.code, answer: null });
      logger.info(`Added selection-criteria question to FAQ bank as draft ${draft.code}`);
    }

    notifyReviewQueue(newDrafts, {
      headline: `${newDrafts.length} new selection-criteria question(s) need an answer`,
      actor: `VA-Bot Selection Criteria Assistant (for ${requestedBy})`,
      byBot: true,
    });
    return results;
  }

  /** Published articles must be edited (which sends them to review), not deleted. */
  static async deleteArticle(id: string) {
    const article = await findArticleOrThrow(id);
    if (article.status === "published") {
      throw new ErrorHandler("Published articles cannot be deleted", 400);
    }
    await article.destroy();
    logger.info(`Deleted FAQ ${article.code}`);
    return { id: article.id };
  }
}
