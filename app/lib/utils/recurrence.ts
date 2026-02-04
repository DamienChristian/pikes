import { CalendarEvent } from "@/app/types";

export interface RecurrenceConfig {
  pattern: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number; // 1-31 for monthly
  endDate?: Date;
  count?: number; // Maximum number of occurrences
}

/**
 * Generate recurring event instances based on the recurrence pattern
 */
export function generateRecurringInstances(
  baseEvent: CalendarEvent,
  config: RecurrenceConfig,
  viewStart: Date,
  viewEnd: Date
): CalendarEvent[] {
  const instances: CalendarEvent[] = [];
  const baseStart = new Date(baseEvent.startDate);
  const baseEnd = new Date(baseEvent.endDate);
  const duration = baseEnd.getTime() - baseStart.getTime();

  let currentDate = new Date(baseStart);
  let occurrenceCount = 0;

  // Determine the end condition
  const maxDate = config.endDate || viewEnd;
  const maxCount = config.count || 365; // Limit to 365 occurrences

  while (
    currentDate <= maxDate &&
    currentDate <= viewEnd &&
    occurrenceCount < maxCount
  ) {
    // Check if this occurrence falls within the view range
    if (currentDate >= viewStart) {
      const instanceEnd = new Date(currentDate.getTime() + duration);

      instances.push({
        ...baseEvent,
        id: `${baseEvent.id}_${currentDate.getTime()}`,
        startDate: new Date(currentDate),
        endDate: instanceEnd,
        parentEventId: baseEvent.id,
        originalDate: new Date(currentDate),
      });

      occurrenceCount++;
    }

    // Move to next occurrence
    currentDate = getNextOccurrence(currentDate, config);

    // Safety check to prevent infinite loops
    if (occurrenceCount > 1000) {
      console.warn("Recurrence generation exceeded 1000 occurrences");
      break;
    }
  }

  return instances;
}

/**
 * Calculate the next occurrence date based on the recurrence pattern
 */
function getNextOccurrence(currentDate: Date, config: RecurrenceConfig): Date {
  const next = new Date(currentDate);

  switch (config.pattern) {
    case "daily":
      next.setDate(next.getDate() + config.interval);
      break;

    case "weekly":
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        // Find the next day in the daysOfWeek array
        const currentDay = next.getDay();
        const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);

        // Find next day in the same week
        const nextDayInWeek = sortedDays.find((day) => day > currentDay);

        if (nextDayInWeek !== undefined) {
          // Next occurrence is in the same week
          next.setDate(next.getDate() + (nextDayInWeek - currentDay));
        } else {
          // Next occurrence is in the next interval week
          const firstDay = sortedDays[0];
          const daysUntilNextWeek =
            7 - currentDay + firstDay + (config.interval - 1) * 7;
          next.setDate(next.getDate() + daysUntilNextWeek);
        }
      } else {
        // Default to weekly on the same day
        next.setDate(next.getDate() + 7 * config.interval);
      }
      break;

    case "monthly":
      if (config.dayOfMonth) {
        // Specific day of month (e.g., 15th of every month)
        next.setMonth(next.getMonth() + config.interval);
        next.setDate(config.dayOfMonth);

        // Handle months with fewer days
        if (next.getDate() !== config.dayOfMonth) {
          next.setDate(0); // Last day of previous month
        }
      } else {
        // Same date in next month
        const targetDay = next.getDate();
        next.setMonth(next.getMonth() + config.interval);

        // Handle months with fewer days
        if (next.getDate() !== targetDay) {
          next.setDate(0); // Last day of previous month
        }
      }
      break;

    case "yearly":
      next.setFullYear(next.getFullYear() + config.interval);
      break;

    case "custom":
      // Custom patterns can be extended here
      next.setDate(next.getDate() + config.interval);
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Check if a date matches the recurrence pattern
 */
export function matchesRecurrencePattern(
  date: Date,
  config: RecurrenceConfig
): boolean {
  if (config.pattern === "weekly" && config.daysOfWeek) {
    return config.daysOfWeek.includes(date.getDay());
  }

  if (config.pattern === "monthly" && config.dayOfMonth) {
    return date.getDate() === config.dayOfMonth;
  }

  return true;
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrencePattern(config: RecurrenceConfig): string {
  const { pattern, interval, daysOfWeek, dayOfMonth } = config;

  const intervalText = interval > 1 ? ` every ${interval}` : "";

  switch (pattern) {
    case "daily":
      return `Daily${intervalText} days`;

    case "weekly":
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const days = daysOfWeek.map((d) => dayNames[d]).join(", ");
        return `Weekly${intervalText} weeks on ${days}`;
      }
      return `Weekly${intervalText} weeks`;

    case "monthly":
      if (dayOfMonth) {
        return `Monthly${intervalText} months on day ${dayOfMonth}`;
      }
      return `Monthly${intervalText} months`;

    case "yearly":
      return `Yearly${intervalText} years`;

    case "custom":
      return `Custom pattern`;

    default:
      return "No recurrence";
  }
}

/**
 * Get readable recurrence summary
 */
export function getRecurrenceSummary(config: RecurrenceConfig): string {
  const patternText = formatRecurrencePattern(config);

  if (config.endDate) {
    const endStr = config.endDate.toLocaleDateString();
    return `${patternText} until ${endStr}`;
  }

  if (config.count) {
    return `${patternText} for ${config.count} occurrences`;
  }

  return `${patternText} indefinitely`;
}
