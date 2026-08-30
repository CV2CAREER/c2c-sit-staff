import { Chat } from "@/models/v1/chat.model";
import { User } from "@/models/v1/user.model";
import { Credentials } from "@/models/v1/credentials.model";
import { callGradientAgent } from "@/utils/digital-factory";
import { extractPageContent } from "@/utils/factory";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("va-chat");

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
  }: {
    message: string;
    sessionId: string;
    userId?: string;
    jobUrl?: string;
    type?: string;
  }): Promise<{ message: string; sessionId: string }> {
    let chat = await Chat.findOne({ where: { sessionId } });

    if (!chat) {
      chat = await Chat.create({
        sessionId,
        messages: [],
        clientId: userId ?? null,
      });
    }

    const currentMessages: ChatMessage[] = [...(chat.messages ?? [])];
    currentMessages.push({ role: "user", message });

    let contextMessage = "";

    // Load client context when a sample session is requested
    if (type === "sample" && userId) {
      logger.info(`VA Chat: Loading client context for userId: ${userId}`);

      const client = await User.findByPk(userId, {
        attributes: ["id", "firstName", "lastName", "email"],
        raw: true,
      });

      if (client) {
        contextMessage += "Client Information:\n";
        contextMessage += `Name: ${(client as any).firstName ?? ""} ${(client as any).lastName ?? ""}\n`;
        contextMessage += `Email: ${(client as any).email}\n`;

        const credentials = await Credentials.findOne({
          where: { clientId: userId, isDeleted: false },
          attributes: ["currentCity", "SeekAggregator", "onboardingDate"],
          raw: true,
        });

        if (credentials) {
          if ((credentials as any).seekEmail)
            contextMessage += `Seek Email: ${(credentials as any).seekEmail}\n`;
          if ((credentials as any).currentCity)
            contextMessage += `Location: ${(credentials as any).currentCity}\n`;
          if ((credentials as any).SeekAggregator)
            contextMessage += `Job Board: ${(credentials as any).SeekAggregator}\n`;
        }
      }
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

    // Build the messages array for the AI
    const apiMessages: GradientMessage[] = currentMessages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.message || m.content || "",
    }));

    if (contextMessage) {
      logger.info(
        `VA Chat: Injecting context (${contextMessage.length} chars) as system message`,
      );
      apiMessages.unshift({
        role: "system",
        content: `You are a Virtual Assistant for CVtoCAREER.
You have access to the client's profile information below.
ALWAYS use this information to answer questions about the client's background.
When a job description is provided, compare the client's profile with the job requirements.

CONTEXT:
${contextMessage}`,
      });
    }

    const gradientRes = await callGradientAgent(apiMessages, sessionId);

    logger.info("VA Chat: Gradient response received");

    const content: string =
      gradientRes?.choices?.[0]?.message?.content ??
      gradientRes?.choices?.[0]?.text ??
      gradientRes?.output ??
      gradientRes?.message ??
      gradientRes?.content ??
      "";

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
