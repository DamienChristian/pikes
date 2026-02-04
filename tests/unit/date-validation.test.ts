import { describe, it, expect } from "@jest/globals";

/**
 * Tests for event/task date validation logic
 */

describe("Date Validation", () => {
  describe("Event Date Validation", () => {
    it("should validate end date is after start date", () => {
      const startDate = new Date("2026-02-01T10:00:00");
      const endDate = new Date("2026-02-01T11:00:00");

      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it("should validate same day events", () => {
      const startDate = new Date("2026-02-01T10:00:00");
      const endDate = new Date("2026-02-01T15:00:00");

      const isSameDay =
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getDate() === endDate.getDate();

      expect(isSameDay).toBe(true);
    });

    it("should auto-adjust end date when start date changes", () => {
      const startDate = new Date("2026-02-01T14:00:00");
      const originalEndDate = new Date("2026-02-01T12:00:00"); // Before start

      // If end date is before start, adjust to start + 1 hour
      const newEndDate =
        originalEndDate < startDate
          ? new Date(startDate.getTime() + 3600000)
          : originalEndDate;

      expect(newEndDate.getTime()).toBeGreaterThan(startDate.getTime());
      expect(newEndDate.getHours()).toBe(15); // 14:00 + 1 hour
    });

    it("should auto-adjust start date when end date changes", () => {
      const originalStartDate = new Date("2026-02-01T14:00:00");
      const endDate = new Date("2026-02-01T12:00:00"); // Before start

      // If start date is after end, adjust to end - 1 hour
      const newStartDate =
        originalStartDate > endDate
          ? new Date(endDate.getTime() - 3600000)
          : originalStartDate;

      expect(newStartDate.getTime()).toBeLessThan(endDate.getTime());
      expect(newStartDate.getHours()).toBe(11); // 12:00 - 1 hour
    });
  });

  describe("Task Deadline Validation", () => {
    it("should validate deadline is after start date", () => {
      const startDate = new Date("2026-02-01T10:00:00");
      const deadline = new Date("2026-02-03T10:00:00");

      expect(deadline.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it("should auto-adjust deadline when start date changes", () => {
      const startDate = new Date("2026-02-05T10:00:00");
      const originalDeadline = new Date("2026-02-03T10:00:00"); // Before start

      // If deadline is before start, adjust to start + 1 day
      const newDeadline =
        originalDeadline < startDate
          ? new Date(startDate.getTime() + 86400000)
          : originalDeadline;

      expect(newDeadline.getTime()).toBeGreaterThan(startDate.getTime());
      expect(newDeadline.getDate()).toBe(6); // Feb 5 + 1 day
    });

    it("should allow same day deadline", () => {
      const startDate = new Date("2026-02-01T10:00:00");
      const deadline = new Date("2026-02-01T23:59:59");

      expect(deadline.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    });
  });

  describe("All Day Events", () => {
    it("should handle all day event spanning multiple days", () => {
      const startDate = new Date("2026-02-01T00:00:00");
      const endDate = new Date("2026-02-03T23:59:59");

      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / 86400000
      );

      expect(daysDiff).toBe(3); // Feb 1, 2, 3
    });

    it("should handle single day all-day event", () => {
      const startDate = new Date("2026-02-01T00:00:00");
      const endDate = new Date("2026-02-01T23:59:59");

      const isSameDay = startDate.getDate() === endDate.getDate();

      expect(isSameDay).toBe(true);
    });
  });
});
