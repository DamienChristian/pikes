import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  isSameMonth,
  isSameDay,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { DateRange } from "@/app/types";

/**
 * Format a date to a specific pattern
 */
export function formatDate(date: Date, pattern: string): string {
  return format(date, pattern);
}

/**
 * Get the start and end dates for a month view
 */
export function getMonthDateRange(date: Date): DateRange {
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));
  return { start, end };
}

/**
 * Get the start and end dates for a week view
 */
export function getWeekDateRange(date: Date): DateRange {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return { start, end };
}

/**
 * Get all days in a month view (including days from previous/next month)
 */
export function getMonthDays(date: Date): Date[] {
  const { start, end } = getMonthDateRange(date);
  const days: Date[] = [];
  let currentDay = start;

  while (currentDay <= end) {
    days.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  return days;
}

/**
 * Get all days in a week view
 */
export function getWeekDays(date: Date): Date[] {
  const { start } = getWeekDateRange(date);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }

  return days;
}

/**
 * Navigate to next/previous month
 */
export function navigateMonth(date: Date, direction: "next" | "prev"): Date {
  return direction === "next" ? addMonths(date, 1) : addMonths(date, -1);
}

/**
 * Navigate to next/previous week
 */
export function navigateWeek(date: Date, direction: "next" | "prev"): Date {
  return direction === "next" ? addWeeks(date, 1) : addWeeks(date, -1);
}

/**
 * Check if a date is in the same month
 */
export function isInSameMonth(date: Date, referenceDate: Date): boolean {
  return isSameMonth(date, referenceDate);
}

/**
 * Check if two dates are the same day
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is the same as another date
 */
export function isSameDateAs(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Check if an event overlaps with a date range
 */
export function isEventInRange(
  eventStart: Date,
  eventEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  return (
    isWithinInterval(eventStart, { start: rangeStart, end: rangeEnd }) ||
    isWithinInterval(eventEnd, { start: rangeStart, end: rangeEnd }) ||
    (eventStart <= rangeStart && eventEnd >= rangeEnd)
  );
}

/**
 * Get time string from date (e.g., "2:30 PM")
 */
export function getTimeString(date: Date): string {
  return format(date, "h:mm a");
}

/**
 * Combine date and time strings into a Date object
 */
export function combineDateAndTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}
