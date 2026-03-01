/**
 * Calendar Member Types
 */
export interface CalendarMember {
  userId: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: "viewer" | "editor";
  addedAt: Date;
}

/**
 * Calendar (collection) Types
 */
export interface UserCalendar {
  id: string;
  userId: string;
  name: string;
  color: string;
  isVisible: boolean;
  isDefault: boolean;
  source: "local" | "imported";
  sourceUrl?: string;
  // Sharing
  members: CalendarMember[];
  isPublicJoinEnabled: boolean;
  defaultJoinRole: "viewer" | "editor";
  shareToken?: string;
  /** Role of the current user: "owner" for calendar owner, or the member's role */
  role: "owner" | "viewer" | "editor";
  /** Owner info (populated for shared calendars) */
  ownerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Note Member Types
 */
export interface NoteMember {
  userId: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: "viewer" | "editor";
  addedAt: Date;
}

/**
 * Event Member Types
 */
export interface EventMember {
  userId: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: "viewer" | "editor";
  addedAt: Date;
}

/**
 * Calendar Event Types
 */
export type EventType = "event" | "task";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color?: string;
  location?: string;
  userId: string;
  calendarId?: string;
  // Sharing
  members: EventMember[];
  createdAt: Date;
  updatedAt: Date;
  type: EventType;
  deadline?: Date;
  completed?: boolean;
  category?: string;
  priority?: "low" | "medium" | "high";
  isRecurring?: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  recurrenceInterval?: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: Date;
  recurrenceCount?: number;
  parentEventId?: string;
  originalDate?: Date;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string;
  location?: string;
  type?: EventType;
  deadline?: Date;
  completed?: boolean;
  category?: string;
  priority?: "low" | "medium" | "high";
  calendarId?: string;
  isRecurring?: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  recurrenceInterval?: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: Date;
  recurrenceCount?: number;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  sessionId: string;
}

/**
 * Calendar View Types
 */
export type CalendarView = "month" | "week" | "day" | "agenda";

/**
 * Date Range Type
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
