import {
  formatDate,
  getMonthDays,
  getWeekDays,
  isToday,
  isEventInRange,
} from "@/app/lib/utils/date";

describe("Date Utilities", () => {
  describe("formatDate", () => {
    it("formats date correctly", () => {
      const date = new Date(2024, 0, 15); // Use explicit year, month, day
      expect(formatDate(date, "yyyy-MM-dd")).toBe("2024-01-15");
    });
  });

  describe("getMonthDays", () => {
    it("returns correct number of days for month view", () => {
      const date = new Date("2024-01-15");
      const days = getMonthDays(date);
      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length).toBeLessThanOrEqual(42);
    });
  });

  describe("getWeekDays", () => {
    it("returns 7 days for week view", () => {
      const date = new Date("2024-01-15");
      const days = getWeekDays(date);
      expect(days).toHaveLength(7);
    });
  });

  describe("isToday", () => {
    it("returns true for today's date", () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it("returns false for past date", () => {
      const pastDate = new Date("2020-01-01");
      expect(isToday(pastDate)).toBe(false);
    });
  });

  describe("isEventInRange", () => {
    it("returns true when event is within range", () => {
      const eventStart = new Date("2024-01-10");
      const eventEnd = new Date("2024-01-15");
      const rangeStart = new Date("2024-01-01");
      const rangeEnd = new Date("2024-01-31");

      expect(isEventInRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(
        true
      );
    });

    it("returns false when event is outside range", () => {
      const eventStart = new Date("2024-02-10");
      const eventEnd = new Date("2024-02-15");
      const rangeStart = new Date("2024-01-01");
      const rangeEnd = new Date("2024-01-31");

      expect(isEventInRange(eventStart, eventEnd, rangeStart, rangeEnd)).toBe(
        false
      );
    });
  });
});
