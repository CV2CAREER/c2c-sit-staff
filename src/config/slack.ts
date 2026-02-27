import { WebClient, ChatPostMessageArguments } from "@slack/web-api";
import { getServiceLogger } from "../utils/createLogger";
import { SLACK_TOKEN_KEY, SLACK_USERS_TOKEN } from "./env";

const logger = getServiceLogger("slack");

const SLACK_TOKEN = SLACK_TOKEN_KEY || SLACK_USERS_TOKEN;

export type TeamMention = "DEVOPS" | "CSM";

export const SLACK_BOT_USERNAME = "Your-App-Alerter"; // one place to change it

let slackClient: WebClient | null = null;

export const getSlackClient = (): WebClient => {
  if (slackClient) return slackClient;

  if (!SLACK_TOKEN) {
    throw new Error("Slack token is missing from environment variables");
  }

  slackClient = new WebClient(SLACK_TOKEN);
  logger.info("✅ Slack client initialized");
  return slackClient;
};

// Core send function — everything goes through here
export const sendSlackMessage = async (
  args: ChatPostMessageArguments & { skipThrow?: boolean },
): Promise<boolean> => {
  const { skipThrow, ...messageArgs } = args;

  try {
    const client = getSlackClient();

    await client.chat.postMessage({
      unfurl_links: false,
      ...messageArgs, // caller can override unfurl_links if needed
    });

    logger.info(`Slack message sent to channel: ${messageArgs.channel}`);
    return true;
  } catch (error: any) {
    logger.error(
      `Failed to send Slack message to ${args.channel}: ${error.message}`,
    );
    if (!skipThrow) return false;
    throw error;
  }
};

// Resolves team mentions into individual @user strings
export const resolveTeamMentions = async (
  team: TeamMention,
  getSlackUserIdsFromQueue: (team: TeamMention) => Promise<string[]>,
): Promise<string> => {
  const ids = await getSlackUserIdsFromQueue(team);
  return ids?.length > 0 ? ids.map((id) => `<@${id}>`).join(" ") : "";
};
