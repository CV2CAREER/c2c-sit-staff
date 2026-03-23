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
export interface StandardSlackNotification {
  node: SlackNode;
  provider: SlackProvider;
  severity: SlackSeverity;
  type: SlackEventType;
  body: string;
  channel?: SlackChannel;
  teamMentions?: "DEVOPS" | "CSM";
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
  channel?: SlackChannel;
  teamMentions?: "DEVOPS" | "CSM";
  location?: SlackLocation;
}
