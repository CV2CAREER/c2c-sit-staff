import { Request } from "express";
import {
  SlackChannel,
  SlackEventType,
  SlackLocation,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";

// slack.types.ts
// teamMentions is a comma-separated string of team tags (e.g. "CSM", "CSM,WFC").
// The Slack helper filters the list against a runtime whitelist
// (CSM / DEVOPS / WFC / SPC) — matches the customer BE contract so tag
// strings are portable between the two repos.
export interface StandardSlackNotification {
  node: SlackNode;
  provider: SlackProvider;
  severity: SlackSeverity;
  type: SlackEventType;
  body: string;
  channel?: SlackChannel | string;
  // Comma-separated list of team codes to @-mention in production posts.
  // Whitelist enforced at send time in slack-helpers so unknown values
  // no-op instead of leaking raw text into the message.
  teamMentions?: string;
  trigger?: string;
  location?: SlackLocation; // Enum for routing
  host?: string; // Raw host for LOC display
  protocol?: string; // Optional protocol
  user?: {
    // Optional user instead of req.user
    firstName: string;
    lastName: string;
  };
}

export interface SlackJobPayload {
  type: "standard";
  node: SlackNode;
  provider: SlackProvider;
  severity: SlackSeverity;
  trigger: string;
  eventType: SlackEventType;
  body: string;
  host: string;
  channel?: SlackChannel | string;
  // Comma-separated list of team codes to @-mention in production posts.
  // Whitelist enforced at send time in slack-helpers so unknown values
  // no-op instead of leaking raw text into the message.
  teamMentions?: string;
  location?: SlackLocation;
}
