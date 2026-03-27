import { Request } from "express";
import { SlackLocation } from "../utils/enum";

export interface TriggerPayload {
  type: "trigger";
  action: string;
  payload: {
    name: string;
    phone: string;
    about?: string;
  };
}

interface CreateContactPayload {
  type: "create-contact";
  user: {
    whatsappNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    location?: SlackLocation;
    host: string; // Add host
    protocol?: string | string[];
  };
}

interface UpdateContactPayload {
  type: "update-contact";
  user: {
    email: string;
    whatsappNumber?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    location?: SlackLocation;
    host: string;
  };
}

export type JustCallJobPayload = TriggerPayload | CreateContactPayload | UpdateContactPayload;
