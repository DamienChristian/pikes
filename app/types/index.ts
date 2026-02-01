/**
 * Calendar Event Types
 */
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string;
  location?: string;
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
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
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
