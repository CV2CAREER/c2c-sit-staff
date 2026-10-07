import { Chat } from "@/models/v1/chat.model";
import { User } from "@/models/v1/user.model";
import { extractNoAnswer, FaqGapSource, NO_ANSWER_INSTRUCTION, recordFaqGap } from "@/utils/faq-gap";
import { buildClientContext } from "@/services/assistant/va-client-context";
import { isSafePublicUrl } from "@/services/assistant/url-guard";
import { callGradientAgent } from "@/utils/digital-factory";
import { extractPageContent } from "@/utils/factory";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";
import { Op, col, fn, where as sqlWhere } from "sequelize";

const logger = getServiceLogger("va-chat");

/** Roles an admin can pick in the VA client search — never staff accounts. */
const CLIENT_FACING_ROLES = ["client", "guest", "customer"];

type GradientMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  message: string;
  content?: string;
};

export class VaChatService {
  /** Name shown in the widget when it is opened on a client's page. */
  static async getClient(clientId: string): Promise<{ id: string; name: string }> {
    const client = await User.findByPk(clientId, {
      attributes: ["id", "firstName", "lastName"],
      raw: true,
    });
    if (!client) throw new ErrorHandler("Client not found", 404);

    const name = `${(client as any).firstName ?? ""} ${(client as any).lastName ?? ""}`.trim();
    return { id: (client as any).id, name: name || `Client ${clientId}` };
  }

  /**
   * Admin client picker: search every client by name or client ID. Admins
   * aren't limited to an assignment list (PCs use /clients-assigned instead).
   * Email is encrypted at rest, so it isn't searchable here.
   */
  static async searchClients(query: string, limit = 20) {
    const term = query.trim().slice(0, 100);
    const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;

    const clients = await User.findAll({
      where: {
        // Client-facing accounts only. Many paying clients still carry the
        // "guest" role (e.g. those on a plan before onboarding finished).
        role: { [Op.in]: CLIENT_FACING_ROLES },
        isDeleted: false,
        ...(term && {
          [Op.or]: [
            { uniqueId: { [Op.iLike]: like } },
            { id: { [Op.iLike]: like } },
            // Full name with and without the middle name ("Partner user Test" / "Partner Test").
            sqlWhere(fn("concat_ws", " ", col("firstName"), col("middleName"), col("lastName")), { [Op.iLike]: like }),
            sqlWhere(fn("concat_ws", " ", col("firstName"), col("lastName")), { [Op.iLike]: like }),
          ],
        }),
      },
      attributes: ["id", "firstName", "lastName", "uniqueId"],
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
      limit,
      raw: true,
    });

    return clients.map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      uniqueId: c.uniqueId ?? c.id,
    }));
  }

  static async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const chat = await Chat.findOne({ where: { sessionId } });
    return chat?.messages ?? [];
  }

  static async sendMessage({
    message,
    sessionId,
    userId,
    jobUrl,
    type,
    askedBy,
  }: {
    message: string;
    sessionId: string;
    userId?: string;
    jobUrl?: string;
    type?: string;
    /** Who is asking — "admin" or "pc" — recorded against unanswered questions. */
    askedBy?: FaqGapSource;
  }): Promise<{ message: string; sessionId: string }> {
    if (type === "sample" && !userId) {
      throw new ErrorHandler("A client is required for a customer conversation", 400);
    }

    // Customer conversations are scoped to one client; Processes has none.
    const sessionClientId = type === "sample" ? userId! : null;

    let chat = await Chat.findOne({ where: { sessionId } });

    if (!chat) {
      chat = await Chat.create({
        sessionId,
        messages: [],
        clientId: sessionClientId,
      });
    } else if ((chat.clientId ?? null) !== sessionClientId) {
      // A session is bound to the client it started with, so one client's
      // history can never be carried into (or read back as) another's.
      throw new ErrorHandler(
        "This conversation belongs to a different client. Start a new chat.",
        409,
      );
    }

    const currentMessages: ChatMessage[] = [...(chat.messages ?? [])];
    currentMessages.push({ role: "user", message });

    let contextMessage = "";

    // Load client context when a sample session is requested
    if (type === "sample" && userId) {
      logger.info(`VA Chat: Loading client context for userId: ${userId}`);
      // Client, job preferences, campaign, manual applications and missing
      // information — allow-listed fields only (see va-client-context.ts).
      contextMessage += await buildClientContext(userId);
    }

    // Extract job URL from message body if not passed explicitly
    let effectiveJobUrl = jobUrl;
    if (!effectiveJobUrl) {
      const urlRegex =
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
      const match = message.match(urlRegex);
      if (match) {
        effectiveJobUrl = match[0];
        logger.info(`VA Chat: Extracted URL from message: ${effectiveJobUrl}`);
      }
    }

    // Never fetch local/private addresses from inside our network (SSRF).
    if (effectiveJobUrl && !isSafePublicUrl(effectiveJobUrl)) {
      logger.warn(`VA Chat: refused to fetch non-public URL: ${effectiveJobUrl}`);
      contextMessage += `\nJob Link: ${effectiveJobUrl} (not fetched — not a public web address)\n`;
      effectiveJobUrl = undefined;
    }

    // Scrape the job URL if present
    if (effectiveJobUrl) {
      logger.info(`VA Chat: Scraping job URL: ${effectiveJobUrl}`);
      try {
        const pageText = await extractPageContent(effectiveJobUrl);
        if (pageText && pageText.length > 100) {
          const truncated =
            pageText.length > 5000 ? pageText.slice(0, 5000) + "..." : pageText;
          contextMessage += `\nJob Link URL: ${effectiveJobUrl}\n`;
          contextMessage += `Job Description:\n${truncated}\n`;
        } else {
          contextMessage += `\nJob Link: ${effectiveJobUrl} (could not fetch content)\n`;
        }
      } catch (err: any) {
        logger.warn(`VA Chat: URL scrape failed: ${err.message}`);
        contextMessage += `\nJob Link: ${effectiveJobUrl} (failed to fetch content)\n`;
      }
    }

    // Build the messages array for the AI. The Gradient agent rejects
    // system/developer messages (its instructions live in the agent config),
    // so only user/assistant turns are sent.
    const apiMessages: GradientMessage[] = currentMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.message || m.content || "",
      }));

    if (contextMessage) {
      logger.info(
        `VA Chat: Injecting context (${contextMessage.length} chars) into the latest user message`,
      );
      // Prepended to this turn only — the stored history keeps the staff
      // member's words as typed, and fresh context is added on every turn.
      const latest = apiMessages[apiMessages.length - 1];
      latest.content = `[Context provided by the CVtoCAREER staff platform — not typed by the user]
You are helping CVtoCAREER staff with the client below.
Answer only from this information. If something is not in it, say it is not on file — never guess or invent details about the client.
When a job description is provided, compare the client's profile with the job requirements.

CONTEXT:
${contextMessage}
[End of context]

${latest.content}`;
    }

    // Lets us detect "no answer" and log it to the FAQ Gap Log.
    const latestTurn = apiMessages[apiMessages.length - 1];
    if (latestTurn) latestTurn.content = `${NO_ANSWER_INSTRUCTION}\n\n---\n\n${latestTurn.content}`;

    const gradientRes = await callGradientAgent(apiMessages, sessionId);

    logger.info("VA Chat: Gradient response received");

    const rawContent: string =
      gradientRes?.choices?.[0]?.message?.content ??
      gradientRes?.choices?.[0]?.text ??
      gradientRes?.output ??
      gradientRes?.message ??
      gradientRes?.content ??
      "";

    const { clean: content, noAnswer } = extractNoAnswer(rawContent);
    if (noAnswer) recordFaqGap(message, askedBy ?? "admin");

    if (!content) {
      logger.warn("VA Chat: AI response content is empty");
    }

    const aiMessage: ChatMessage = { role: "assistant", message: content };
    const updatedMessages = [...currentMessages, aiMessage];

    await chat.update({ messages: updatedMessages });

    return { message: aiMessage.message, sessionId: chat.sessionId };
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = await Chat.destroy({ where: { sessionId } });
    return deleted > 0;
  }
}
