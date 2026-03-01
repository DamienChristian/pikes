import { CalendarEvent } from "@/app/types";
import { format } from "date-fns";

/**
 * Convert a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date | string, allDay: boolean = false): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (allDay) {
    // All-day events use VALUE=DATE format (YYYYMMDD)
    return format(d, "yyyyMMdd");
  }

  // Regular events use UTC format
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const minute = String(d.getUTCMinutes()).padStart(2, "0");
  const second = String(d.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate UID for an event
 */
function generateUID(eventId: string, domain: string = "calendar.app"): string {
  return `${eventId}@${domain}`;
}

/**
 * Convert a single event to ICS VEVENT format
 */
export function eventToICS(event: CalendarEvent): string {
  const lines: string[] = [];

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${generateUID(event.id)}`);
  lines.push(`DTSTAMP:${formatICSDate(new Date())}`);

  // Start and end dates
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICSDate(event.startDate, true)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICSDate(event.endDate, true)}`);
  } else {
    lines.push(`DTSTART:${formatICSDate(event.startDate)}`);
    lines.push(`DTEND:${formatICSDate(event.endDate)}`);
  }

  // Title (SUMMARY)
  lines.push(`SUMMARY:${escapeICSText(event.title)}`);

  // Description
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  // Location
  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  // Category
  if (event.category) {
    lines.push(`CATEGORIES:${escapeICSText(event.category)}`);
  }

  // Priority (convert our priority to RFC 5545 priority)
  if (event.priority) {
    const icsriority =
      event.priority === "high" ? "1" : event.priority === "medium" ? "5" : "9";
    lines.push(`PRIORITY:${icsriority}`);
  }

  // Status for tasks
  if (event.type === "task") {
    lines.push(`STATUS:${event.completed ? "COMPLETED" : "NEEDS-ACTION"}`);
    if (event.deadline) {
      lines.push(`DUE:${formatICSDate(event.deadline)}`);
    }
  }

  // Recurrence rule
  if (event.isRecurring && event.recurrencePattern) {
    const rrule = generateRRule(event);
    if (rrule) {
      lines.push(`RRULE:${rrule}`);
    }
  }

  // Created and modified timestamps
  lines.push(`CREATED:${formatICSDate(event.createdAt)}`);
  lines.push(`LAST-MODIFIED:${formatICSDate(event.updatedAt)}`);

  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

/**
 * Generate RRULE string from recurrence settings
 */
function generateRRule(event: CalendarEvent): string | null {
  if (!event.recurrencePattern) return null;

  const parts: string[] = [];

  // Frequency
  const freqMap: Record<string, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
    yearly: "YEARLY",
  };
  const freq = freqMap[event.recurrencePattern];
  if (!freq) return null;

  parts.push(`FREQ=${freq}`);

  // Interval
  if (event.recurrenceInterval && event.recurrenceInterval > 1) {
    parts.push(`INTERVAL=${event.recurrenceInterval}`);
  }

  // Days of week (for weekly recurrence)
  if (
    event.recurrencePattern === "weekly" &&
    event.recurrenceDaysOfWeek &&
    event.recurrenceDaysOfWeek.length > 0
  ) {
    const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const days = event.recurrenceDaysOfWeek.map((d) => dayMap[d]).join(",");
    parts.push(`BYDAY=${days}`);
  }

  // End date
  if (event.recurrenceEndDate) {
    parts.push(`UNTIL=${formatICSDate(event.recurrenceEndDate, event.allDay)}`);
  }

  // Count
  if (event.recurrenceCount) {
    parts.push(`COUNT=${event.recurrenceCount}`);
  }

  return parts.join(";");
}

/**
 * Convert multiple events to a complete ICS file
 */
export function eventsToICS(events: CalendarEvent[]): string {
  const lines: string[] = [];

  // Calendar header
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Calendar App//Calendar 1.0//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("X-WR-CALNAME:My Calendar");
  lines.push("X-WR-TIMEZONE:UTC");

  // Add all events
  events.forEach((event) => {
    lines.push(eventToICS(event));
  });

  // Calendar footer
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Parse ICS file content and extract events
 */
export interface ParsedICSEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  category?: string;
  priority?: "low" | "medium" | "high";
  recurrence?: {
    pattern?: "daily" | "weekly" | "monthly" | "yearly";
    interval?: number;
    daysOfWeek?: number[];
    endDate?: Date;
    count?: number;
  };
}

/**
 * Parse a date from ICS format
 */
function parseICSDate(dateStr: string): Date {
  // Handle all-day format (YYYYMMDD)
  if (dateStr.length === 8) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }

  // Handle UTC format (YYYYMMDDTHHMMSSZ)
  if (dateStr.endsWith("Z")) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Fallback to standard parsing
  return new Date(dateStr);
}

/**
 * Unescape ICS text fields
 */
function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Parse RRULE string
 */
function parseRRule(rrule: string): ParsedICSEvent["recurrence"] | undefined {
  const parts = rrule.split(";");
  const recurrence: ParsedICSEvent["recurrence"] = {};

  parts.forEach((part) => {
    const [key, value] = part.split("=");

    if (key === "FREQ") {
      const freqMap: Record<string, "daily" | "weekly" | "monthly" | "yearly"> =
        {
          DAILY: "daily",
          WEEKLY: "weekly",
          MONTHLY: "monthly",
          YEARLY: "yearly",
        };
      recurrence.pattern = freqMap[value];
    } else if (key === "INTERVAL") {
      recurrence.interval = parseInt(value);
    } else if (key === "BYDAY") {
      const dayMap: Record<string, number> = {
        SU: 0,
        MO: 1,
        TU: 2,
        WE: 3,
        TH: 4,
        FR: 5,
        SA: 6,
      };
      recurrence.daysOfWeek = value
        .split(",")
        .map((d) => dayMap[d])
        .filter((d) => d !== undefined);
    } else if (key === "UNTIL") {
      recurrence.endDate = parseICSDate(value);
    } else if (key === "COUNT") {
      recurrence.count = parseInt(value);
    }
  });

  return recurrence;
}

/**
 * Parse ICS file content
 */
export interface ParsedICSResult {
  calendarName?: string;
  events: ParsedICSEvent[];
}

export function parseICS(icsContent: string): ParsedICSEvent[] {
  const result = parseICSWithMeta(icsContent);
  return result.events;
}

export function parseICSWithMeta(icsContent: string): ParsedICSResult {
  const events: ParsedICSEvent[] = [];
  const lines = icsContent.split(/\r?\n/);

  let currentEvent: Partial<ParsedICSEvent> | null = null;
  let isAllDay = false;
  let calendarName: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Handle line folding (continuation lines start with space or tab)
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      i++;
      line += lines[i].substring(1);
    }

    if (line === "BEGIN:VEVENT") {
      currentEvent = { allDay: false };
      isAllDay = false;
    } else if (!currentEvent && line.startsWith("X-WR-CALNAME:")) {
      calendarName = line.substring("X-WR-CALNAME:".length).trim();
    } else if (line === "END:VEVENT" && currentEvent) {
      if (
        currentEvent.title &&
        currentEvent.startDate &&
        currentEvent.endDate
      ) {
        events.push(currentEvent as ParsedICSEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const fullKey = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);

      // Split key and parameters
      const [key, ...params] = fullKey.split(";");

      switch (key) {
        case "SUMMARY":
          currentEvent.title = unescapeICSText(value);
          break;
        case "DESCRIPTION":
          currentEvent.description = unescapeICSText(value);
          break;
        case "LOCATION":
          currentEvent.location = unescapeICSText(value);
          break;
        case "CATEGORIES":
          currentEvent.category = unescapeICSText(value.split(",")[0]);
          break;
        case "DTSTART":
          isAllDay = params.some((p) => p === "VALUE=DATE");
          currentEvent.startDate = parseICSDate(value);
          currentEvent.allDay = isAllDay;
          break;
        case "DTEND":
          currentEvent.endDate = parseICSDate(value);
          break;
        case "PRIORITY":
          const priority = parseInt(value);
          currentEvent.priority =
            priority <= 3 ? "high" : priority <= 6 ? "medium" : "low";
          break;
        case "RRULE":
          currentEvent.recurrence = parseRRule(value);
          break;
      }
    }
  }

  return { calendarName, events };
}

/**
 * Download ICS file in the browser
 */
export function downloadICS(
  content: string,
  filename: string = "calendar.ics"
): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
