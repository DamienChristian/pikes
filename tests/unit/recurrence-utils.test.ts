import {
  generateRecurringInstances,
  matchesRecurrencePattern,
  formatRecurrencePattern,
  getRecurrenceSummary,
  RecurrenceConfig,
} from "@/app/lib/utils/recurrence";
import { CalendarEvent } from "@/app/types";

// Helper to build a minimal CalendarEvent for recurrence tests
function makeBase(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt_1",
    title: "Recurring",
    startDate: new Date("2026-03-02T10:00:00Z"), // Monday 2 March 2026
    endDate: new Date("2026-03-02T11:00:00Z"),
    allDay: false,
    userId: "user_1",
    members: [],
    type: "event",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Recurrence Utilities", () => {
  // ---------------------------------------------------------------------------
  // generateRecurringInstances — daily
  // ---------------------------------------------------------------------------
  describe("generateRecurringInstances — daily", () => {
    it("generates daily instances within view range", () => {
      const base = makeBase();
      const config: RecurrenceConfig = { pattern: "daily", interval: 1 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-05T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // March 2, 3, 4, 5 = 4 instances
      expect(instances).toHaveLength(4);
      expect(instances[0].startDate).toEqual(new Date("2026-03-02T10:00:00Z"));
      expect(instances[3].startDate).toEqual(new Date("2026-03-05T10:00:00Z"));
    });

    it("respects interval", () => {
      const base = makeBase();
      const config: RecurrenceConfig = { pattern: "daily", interval: 3 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-12T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // March 2, 5, 8, 11
      expect(instances).toHaveLength(4);
      expect(instances[1].startDate).toEqual(new Date("2026-03-05T10:00:00Z"));
    });

    it("respects count limit", () => {
      const base = makeBase();
      const config: RecurrenceConfig = {
        pattern: "daily",
        interval: 1,
        count: 3,
      };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-12-31T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );
      expect(instances).toHaveLength(3);
    });

    it("respects endDate limit", () => {
      const base = makeBase();
      const config: RecurrenceConfig = {
        pattern: "daily",
        interval: 1,
        endDate: new Date("2026-03-04T23:59:59Z"),
      };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-31T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );
      // March 2, 3, 4
      expect(instances).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // generateRecurringInstances — weekly
  // ---------------------------------------------------------------------------
  describe("generateRecurringInstances — weekly", () => {
    it("generates weekly instances on the same day", () => {
      const base = makeBase(); // Monday
      const config: RecurrenceConfig = { pattern: "weekly", interval: 1 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-23T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // March 2, 9, 16, 23
      expect(instances).toHaveLength(4);
      // Verify the date portion (local time arithmetic may shift UTC by DST offset)
      expect(instances[1].startDate.getDate()).toBe(9);
    });

    it("generates instances on specific days of week", () => {
      const base = makeBase(); // Starts Monday March 2
      const config: RecurrenceConfig = {
        pattern: "weekly",
        interval: 1,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-08T23:59:59Z"); // One week

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // Should include Mon 2, Wed 4, Fri 6
      expect(instances.length).toBeGreaterThanOrEqual(3);
    });

    it("respects bi-weekly interval", () => {
      const base = makeBase();
      const config: RecurrenceConfig = { pattern: "weekly", interval: 2 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-04-13T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // March 2, March 16, March 30, April 13
      expect(instances).toHaveLength(4);
      expect(instances[1].startDate.getDate()).toBe(16);
    });
  });

  // ---------------------------------------------------------------------------
  // generateRecurringInstances — monthly
  // ---------------------------------------------------------------------------
  describe("generateRecurringInstances — monthly", () => {
    it("generates monthly instances on the same date", () => {
      const base = makeBase(); // March 2
      const config: RecurrenceConfig = { pattern: "monthly", interval: 1 };
      const viewStart = new Date("2026-03-01T00:00:00Z");
      const viewEnd = new Date("2026-06-30T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // March 2, April 2, May 2, June 2
      expect(instances).toHaveLength(4);
      expect(instances[1].startDate.getMonth()).toBe(3); // April
      expect(instances[1].startDate.getDate()).toBe(2);
    });

    it("generates monthly on specific dayOfMonth", () => {
      const base = makeBase();
      const config: RecurrenceConfig = {
        pattern: "monthly",
        interval: 1,
        dayOfMonth: 15,
      };
      const viewStart = new Date("2026-03-15T00:00:00Z");
      const viewEnd = new Date("2026-06-30T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // Each instance should be on the 15th
      instances.forEach((inst) => {
        expect(inst.startDate.getDate()).toBe(15);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // generateRecurringInstances — yearly
  // ---------------------------------------------------------------------------
  describe("generateRecurringInstances — yearly", () => {
    it("generates yearly instances", () => {
      const base = makeBase({
        startDate: new Date("2024-03-02T10:00:00Z"),
        endDate: new Date("2024-03-02T11:00:00Z"),
      });
      const config: RecurrenceConfig = { pattern: "yearly", interval: 1 };
      const viewStart = new Date("2024-01-01T00:00:00Z");
      const viewEnd = new Date("2027-12-31T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // 2024, 2025, 2026, 2027
      expect(instances).toHaveLength(4);
      expect(instances[0].startDate.getFullYear()).toBe(2024);
      expect(instances[3].startDate.getFullYear()).toBe(2027);
    });
  });

  // ---------------------------------------------------------------------------
  // generateRecurringInstances — edge cases
  // ---------------------------------------------------------------------------
  describe("generateRecurringInstances — edge cases", () => {
    it("preserves event duration for each instance", () => {
      const base = makeBase({
        startDate: new Date("2026-03-02T10:00:00Z"),
        endDate: new Date("2026-03-02T12:30:00Z"), // 2.5 hours
      });
      const config: RecurrenceConfig = { pattern: "daily", interval: 1 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-03T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      instances.forEach((inst) => {
        const dur = inst.endDate.getTime() - inst.startDate.getTime();
        expect(dur).toBe(2.5 * 60 * 60 * 1000);
      });
    });

    it("sets parentEventId and unique id on instances", () => {
      const base = makeBase();
      const config: RecurrenceConfig = { pattern: "daily", interval: 1 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-04T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      instances.forEach((inst) => {
        expect(inst.parentEventId).toBe("evt_1");
        expect(inst.id).toContain("evt_1_");
      });

      // IDs should be unique
      const ids = instances.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("returns empty array when view is before event start", () => {
      const base = makeBase({
        startDate: new Date("2026-06-01T10:00:00Z"),
        endDate: new Date("2026-06-01T11:00:00Z"),
      });
      const config: RecurrenceConfig = { pattern: "daily", interval: 1 };
      const viewStart = new Date("2026-03-01T00:00:00Z");
      const viewEnd = new Date("2026-03-31T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );
      expect(instances).toHaveLength(0);
    });

    it("custom pattern advances by interval days", () => {
      const base = makeBase();
      const config: RecurrenceConfig = { pattern: "custom", interval: 5 };
      const viewStart = new Date("2026-03-02T00:00:00Z");
      const viewEnd = new Date("2026-03-22T23:59:59Z");

      const instances = generateRecurringInstances(
        base,
        config,
        viewStart,
        viewEnd
      );

      // March 2, 7, 12, 17, 22 = 5 instances
      expect(instances).toHaveLength(5);
    });
  });

  // ---------------------------------------------------------------------------
  // matchesRecurrencePattern
  // ---------------------------------------------------------------------------
  describe("matchesRecurrencePattern", () => {
    it("returns true when day matches weekly daysOfWeek", () => {
      // Use local-time constructor to avoid UTC midnight → previous day in local tz
      const monday = new Date(2026, 2, 2); // Monday = 1
      expect(
        matchesRecurrencePattern(monday, {
          pattern: "weekly",
          interval: 1,
          daysOfWeek: [1, 3, 5],
        })
      ).toBe(true);
    });

    it("returns false when day does not match weekly daysOfWeek", () => {
      const tuesday = new Date(2026, 2, 3); // Tuesday = 2
      expect(
        matchesRecurrencePattern(tuesday, {
          pattern: "weekly",
          interval: 1,
          daysOfWeek: [1, 3, 5],
        })
      ).toBe(false);
    });

    it("returns true when date matches monthly dayOfMonth", () => {
      const fifteenth = new Date(2026, 2, 15);
      expect(
        matchesRecurrencePattern(fifteenth, {
          pattern: "monthly",
          interval: 1,
          dayOfMonth: 15,
        })
      ).toBe(true);
    });

    it("returns false when date does not match monthly dayOfMonth", () => {
      const tenth = new Date(2026, 2, 10);
      expect(
        matchesRecurrencePattern(tenth, {
          pattern: "monthly",
          interval: 1,
          dayOfMonth: 15,
        })
      ).toBe(false);
    });

    it("returns true for other patterns (no day-level filter)", () => {
      const anyDate = new Date("2026-03-10");
      expect(
        matchesRecurrencePattern(anyDate, { pattern: "daily", interval: 1 })
      ).toBe(true);
      expect(
        matchesRecurrencePattern(anyDate, { pattern: "yearly", interval: 1 })
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // formatRecurrencePattern
  // ---------------------------------------------------------------------------
  describe("formatRecurrencePattern", () => {
    it("formats daily with interval 1", () => {
      expect(formatRecurrencePattern({ pattern: "daily", interval: 1 })).toBe(
        "Daily days"
      );
    });

    it("formats daily with interval > 1", () => {
      expect(formatRecurrencePattern({ pattern: "daily", interval: 3 })).toBe(
        "Daily every 3 days"
      );
    });

    it("formats weekly with specific days", () => {
      const result = formatRecurrencePattern({
        pattern: "weekly",
        interval: 1,
        daysOfWeek: [1, 3, 5],
      });
      expect(result).toContain("Mon");
      expect(result).toContain("Wed");
      expect(result).toContain("Fri");
    });

    it("formats weekly without days", () => {
      expect(formatRecurrencePattern({ pattern: "weekly", interval: 2 })).toBe(
        "Weekly every 2 weeks"
      );
    });

    it("formats monthly with dayOfMonth", () => {
      const result = formatRecurrencePattern({
        pattern: "monthly",
        interval: 1,
        dayOfMonth: 15,
      });
      expect(result).toContain("day 15");
    });

    it("formats monthly without dayOfMonth", () => {
      expect(formatRecurrencePattern({ pattern: "monthly", interval: 1 })).toBe(
        "Monthly months"
      );
    });

    it("formats yearly", () => {
      expect(formatRecurrencePattern({ pattern: "yearly", interval: 1 })).toBe(
        "Yearly years"
      );
    });

    it("formats custom", () => {
      expect(formatRecurrencePattern({ pattern: "custom", interval: 1 })).toBe(
        "Custom pattern"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getRecurrenceSummary
  // ---------------------------------------------------------------------------
  describe("getRecurrenceSummary", () => {
    it("appends end date when provided", () => {
      const result = getRecurrenceSummary({
        pattern: "daily",
        interval: 1,
        endDate: new Date("2026-06-01"),
      });
      expect(result).toContain("until");
      expect(result).toContain("2026");
    });

    it("appends count when provided", () => {
      const result = getRecurrenceSummary({
        pattern: "weekly",
        interval: 1,
        count: 10,
      });
      expect(result).toContain("10 occurrences");
    });

    it("says indefinitely when no end condition", () => {
      const result = getRecurrenceSummary({
        pattern: "monthly",
        interval: 1,
      });
      expect(result).toContain("indefinitely");
    });
  });
});
