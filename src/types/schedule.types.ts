import { DayOfWeek } from "../utils/enum";

// Re-export DayOfWeek for convenience
export { DayOfWeek };

// Session Type for client availability
export type SessionType =
  | "screening_preparation"
  | "interview_panel"
  | "career_consultation";

// Time slot interface
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  hasExpired: boolean;
}

// Schedule creation interface
export interface IScheduleCreate {
  timezone?: string;
  date?: Date;
  day?: DayOfWeek;
  time?: TimeSlot[];
  isAvailable?: boolean;
  coachId: string;
}

// Schedule update interface
export interface IScheduleUpdate {
  timezone?: string;
  date?: Date;
  day?: DayOfWeek;
  time?: TimeSlot[];
  isAvailable?: boolean;
}

// Schedule response interface
export interface IScheduleResponse {
  id: string;
  timezone?: string;
  date?: Date;
  day?: DayOfWeek;
  time: TimeSlot[];
  isAvailable: boolean;
  isDeleted: boolean;
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Client Availability creation interface
export interface IClientAvailabilityCreate {
  day: DayOfWeek;
  timezone: string;
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  notes?: string;
}

// Client Availability update interface
export interface IClientAvailabilityUpdate {
  day?: DayOfWeek;
  timezone?: string;
  startTime?: string;
  endTime?: string;
  sessionType?: SessionType;
  notes?: string;
  isAvailable?: boolean;
}

// Client Availability response interface
export interface IClientAvailabilityResponse {
  id: string;
  day: DayOfWeek;
  timezone: string;
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  isAvailable: boolean;
  isDeleted: boolean;
  clientId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}