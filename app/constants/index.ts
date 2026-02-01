/**
 * Application Constants
 */

// Calendar View Options
export const CALENDAR_VIEWS = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day",
  AGENDA: "agenda",
} as const;

// Date Format Patterns
export const DATE_FORMATS = {
  DISPLAY_DATE: "MMM d, yyyy",
  DISPLAY_TIME: "h:mm a",
  DISPLAY_DATETIME: "MMM d, yyyy h:mm a",
  ISO_DATE: "yyyy-MM-dd",
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

// Event Color Options
export const EVENT_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Gray", value: "#6B7280" },
] as const;

// API Routes
export const API_ROUTES = {
  EVENTS: "/api/events",
  EVENT_BY_ID: (id: string) => `/api/events/${id}`,
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
