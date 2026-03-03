import {
  formatDate,
  getMonthDays,
  getMonthDateRange,
  getWeekDays,
  getWeekDateRange,
  navigateMonth,
  navigateWeek,
  isToday,
  isSameDateAs,
  isInSameMonth,
  isEventInRange,
  parseDate,
  getTimeString,
  combineDateAndTime,
} from "@/app/lib/utils/date";

describe("Date Utilities", () => {
  // ---------------------------------------------------------------------------
  // formatDate
  // ---------------------------------------------------------------------------
  describe("formatDate", () => {
    it("formats date as yyyy-MM-dd", () => {
      const date = new Date(2024, 0, 15);
      expect(formatDate(date, "yyyy-MM-dd")).toBe("2024-01-15");
    });

    it("formats date with time pattern", () => {
      const date = new Date(2026, 2, 2, 14, 30);
      expect(formatDate(date, "h:mm a")).toBe("2:30 PM");
    });

    it("formats date with full month name", () => {
      const date = new Date(2026, 0, 1);
      expect(formatDate(date, "MMMM yyyy")).toBe("January 2026");
    });

    it("handles leap year date", () => {
      const leapDay = new Date(2024, 1, 29);
      expect(formatDate(leapDay, "yyyy-MM-dd")).toBe("2024-02-29");
    });

    it("handles year boundary", () => {
      const dec31 = new Date(2025, 11, 31);
      expect(formatDate(dec31, "yyyy-MM-dd")).toBe("2025-12-31");
    });
  });

  // ---------------------------------------------------------------------------
  // getMonthDateRange
  // ---------------------------------------------------------------------------
  describe("getMonthDateRange", () => {
    it("returns range that encompasses the full month", () => {
      const date = new Date(2026, 2, 15); // March 2026
      const { start, end } = getMonthDateRange(date);
      // start should be Sunday of the week containing March 1
      expect(start.getDay()).toBe(0); // Sunday
      expect(start <= new Date(2026, 2, 1)).toBe(true);
      // end should be Saturday of the week containing March 31
      expect(end.getDay()).toBe(6); // Saturday
      expect(end >= new Date(2026, 2, 31)).toBe(true);
    });

    it("handles February in a leap year", () => {
      const { start, end } = getMonthDateRange(new Date(2024, 1, 15));
      expect(start <= new Date(2024, 1, 1)).toBe(true);
      expect(end >= new Date(2024, 1, 29)).toBe(true);
    });

    it("handles February in a non-leap year", () => {
      const { start, end } = getMonthDateRange(new Date(2026, 1, 15));
      expect(start <= new Date(2026, 1, 1)).toBe(true);
      expect(end >= new Date(2026, 1, 28)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getMonthDays
  // ---------------------------------------------------------------------------
  describe("getMonthDays", () => {
    it("returns correct number of days for month view (multiples of 7)", () => {
      const date = new Date("2024-01-15");
      const days = getMonthDays(date);
      expect(days.length % 7).toBe(0);
      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length).toBeLessThanOrEqual(42);
    });

    it("includes days from previous/next month to fill weeks", () => {
      // March 2026 starts on Sunday — first day should be March 1
      const days = getMonthDays(new Date(2026, 2, 15));
      const firstDay = days[0];
      const lastDay = days[days.length - 1];

      // First day is start of week containing March 1
      expect(firstDay.getDay()).toBe(0); // Sunday
      expect(lastDay.getDay()).toBe(6); // Saturday
    });

    it("returns 28 days when month perfectly fills 4 weeks", () => {
      // February 2026 starts on Sunday and has 28 days — perfect 4x7
      const days = getMonthDays(new Date(2026, 1, 15));
      expect(days.length).toBe(28);
    });

    it("handles leap year February", () => {
      const days = getMonthDays(new Date(2024, 1, 15));
      // Feb 2024 has 29 days, starts Thursday → needs ≥ 35 days
      expect(days.length).toBeGreaterThanOrEqual(35);
    });
  });

  // ---------------------------------------------------------------------------
  // getWeekDateRange
  // ---------------------------------------------------------------------------
  describe("getWeekDateRange", () => {
    it("returns a 7-day range starting on Sunday", () => {
      const { start, end } = getWeekDateRange(new Date(2026, 2, 4)); // Wednesday
      expect(start.getDay()).toBe(0); // Sunday
      expect(end.getDay()).toBe(6); // Saturday
    });
  });

  // ---------------------------------------------------------------------------
  // getWeekDays
  // ---------------------------------------------------------------------------
  describe("getWeekDays", () => {
    it("returns 7 days for week view", () => {
      const date = new Date("2024-01-15");
      const days = getWeekDays(date);
      expect(days).toHaveLength(7);
    });

    it("consecutive days differ by exactly 1 day", () => {
      const days = getWeekDays(new Date(2026, 2, 4));
      for (let i = 1; i < days.length; i++) {
        const diff = days[i].getTime() - days[i - 1].getTime();
        expect(diff).toBe(24 * 60 * 60 * 1000);
      }
    });

    it("starts on Sunday", () => {
      const days = getWeekDays(new Date(2026, 2, 4)); // Wednesday
      expect(days[0].getDay()).toBe(0); // Sunday
    });
  });

  // ---------------------------------------------------------------------------
  // navigateMonth
  // ---------------------------------------------------------------------------
  describe("navigateMonth", () => {
    it("navigates to next month", () => {
      const result = navigateMonth(new Date(2026, 2, 15), "next");
      expect(result.getMonth()).toBe(3); // April
      expect(result.getFullYear()).toBe(2026);
    });

    it("navigates to previous month", () => {
      const result = navigateMonth(new Date(2026, 2, 15), "prev");
      expect(result.getMonth()).toBe(1); // February
    });

    it("wraps from December to January", () => {
      const result = navigateMonth(new Date(2026, 11, 15), "next");
      expect(result.getMonth()).toBe(0);
      expect(result.getFullYear()).toBe(2027);
    });

    it("wraps from January to December", () => {
      const result = navigateMonth(new Date(2026, 0, 15), "prev");
      expect(result.getMonth()).toBe(11);
      expect(result.getFullYear()).toBe(2025);
    });
  });

  // ---------------------------------------------------------------------------
  // navigateWeek
  // ---------------------------------------------------------------------------
  describe("navigateWeek", () => {
    it("navigates to next week (7 days forward)", () => {
      const base = new Date(2026, 2, 2);
      const result = navigateWeek(base, "next");
      expect(result.getDate()).toBe(9);
    });

    it("navigates to previous week (7 days backward)", () => {
      const base = new Date(2026, 2, 9);
      const result = navigateWeek(base, "prev");
      expect(result.getDate()).toBe(2);
    });

    it("wraps across month boundary", () => {
      const base = new Date(2026, 2, 30); // March 30
      const result = navigateWeek(base, "next");
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(6);
    });
  });

  // ---------------------------------------------------------------------------
  // isToday
  // ---------------------------------------------------------------------------
  describe("isToday", () => {
    it("returns true for today's date", () => {
      expect(isToday(new Date())).toBe(true);
    });

    it("returns false for past date", () => {
      expect(isToday(new Date("2020-01-01"))).toBe(false);
    });

    it("returns false for future date", () => {
      expect(isToday(new Date("2099-12-31"))).toBe(false);
    });

    it("returns true even with different time on same day", () => {
      const now = new Date();
      const sameDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      expect(isToday(sameDay)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isSameDateAs
  // ---------------------------------------------------------------------------
  describe("isSameDateAs", () => {
    it("returns true for same date, different time", () => {
      expect(
        isSameDateAs(new Date(2026, 2, 2, 10, 0), new Date(2026, 2, 2, 18, 30))
      ).toBe(true);
    });

    it("returns false for different dates", () => {
      expect(isSameDateAs(new Date(2026, 2, 2), new Date(2026, 2, 3))).toBe(
        false
      );
    });
  });

  // ---------------------------------------------------------------------------
  // isInSameMonth
  // ---------------------------------------------------------------------------
  describe("isInSameMonth", () => {
    it("returns true for same month and year", () => {
      expect(isInSameMonth(new Date(2026, 2, 1), new Date(2026, 2, 31))).toBe(
        true
      );
    });

    it("returns false for different months", () => {
      expect(isInSameMonth(new Date(2026, 2, 31), new Date(2026, 3, 1))).toBe(
        false
      );
    });

    it("returns false for same month but different year", () => {
      expect(isInSameMonth(new Date(2025, 2, 15), new Date(2026, 2, 15))).toBe(
        false
      );
    });
  });

  // ---------------------------------------------------------------------------
  // isEventInRange
  // ---------------------------------------------------------------------------
  describe("isEventInRange", () => {
    const rangeStart = new Date("2024-01-01");
    const rangeEnd = new Date("2024-01-31");

    it("returns true when event is fully within range", () => {
      expect(
        isEventInRange(
          new Date("2024-01-10"),
          new Date("2024-01-15"),
          rangeStart,
          rangeEnd
        )
      ).toBe(true);
    });

    it("returns true when event starts before and ends within range", () => {
      expect(
        isEventInRange(
          new Date("2023-12-28"),
          new Date("2024-01-05"),
          rangeStart,
          rangeEnd
        )
      ).toBe(true);
    });

    it("returns true when event starts within and ends after range", () => {
      expect(
        isEventInRange(
          new Date("2024-01-28"),
          new Date("2024-02-05"),
          rangeStart,
          rangeEnd
        )
      ).toBe(true);
    });

    it("returns true when event spans the entire range", () => {
      expect(
        isEventInRange(
          new Date("2023-12-01"),
          new Date("2024-02-28"),
          rangeStart,
          rangeEnd
        )
      ).toBe(true);
    });

    it("returns false when event is entirely before range", () => {
      expect(
        isEventInRange(
          new Date("2023-11-01"),
          new Date("2023-12-15"),
          rangeStart,
          rangeEnd
        )
      ).toBe(false);
    });

    it("returns false when event is entirely after range", () => {
      expect(
        isEventInRange(
          new Date("2024-02-10"),
          new Date("2024-02-15"),
          rangeStart,
          rangeEnd
        )
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // parseDate
  // ---------------------------------------------------------------------------
  describe("parseDate", () => {
    it("parses ISO date string", () => {
      const d = parseDate("2026-03-02");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(2);
    });

    it("parses ISO datetime string", () => {
      const d = parseDate("2026-03-02T14:30:00");
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
    });
  });

  // ---------------------------------------------------------------------------
  // getTimeString
  // ---------------------------------------------------------------------------
  describe("getTimeString", () => {
    it("formats morning time", () => {
      const d = new Date(2026, 2, 2, 9, 15);
      expect(getTimeString(d)).toBe("9:15 AM");
    });

    it("formats afternoon time", () => {
      const d = new Date(2026, 2, 2, 14, 30);
      expect(getTimeString(d)).toBe("2:30 PM");
    });

    it("formats midnight as 12:00 AM", () => {
      const d = new Date(2026, 2, 2, 0, 0);
      expect(getTimeString(d)).toBe("12:00 AM");
    });

    it("formats noon as 12:00 PM", () => {
      const d = new Date(2026, 2, 2, 12, 0);
      expect(getTimeString(d)).toBe("12:00 PM");
    });
  });

  // ---------------------------------------------------------------------------
  // combineDateAndTime
  // ---------------------------------------------------------------------------
  describe("combineDateAndTime", () => {
    it("combines a date with a time string", () => {
      const date = new Date(2026, 2, 2);
      const result = combineDateAndTime(date, "14:30");
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(0);
      expect(result.getDate()).toBe(2);
    });

    it("handles midnight", () => {
      const result = combineDateAndTime(new Date(2026, 2, 2), "0:00");
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("preserves the date portion", () => {
      const date = new Date(2026, 5, 15);
      const result = combineDateAndTime(date, "23:59");
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
    });
  });

  // ---------------------------------------------------------------------------
  // Leap year edge cases
  // ---------------------------------------------------------------------------
  describe("leap year edge cases", () => {
    it("February 2024 (leap year) month view includes Feb 29", () => {
      const days = getMonthDays(new Date(2024, 1, 15));
      const feb29 = days.find((d) => d.getMonth() === 1 && d.getDate() === 29);
      expect(feb29).toBeDefined();
    });

    it("February 2026 (non-leap year) month view has no Feb 29", () => {
      const days = getMonthDays(new Date(2026, 1, 15));
      const feb29 = days.find(
        (d) =>
          d.getMonth() === 1 && d.getDate() === 29 && d.getFullYear() === 2026
      );
      expect(feb29).toBeUndefined();
    });

    it("navigateMonth from Jan 31 to Feb handles short month", () => {
      const result = navigateMonth(new Date(2026, 0, 31), "next");
      // date-fns addMonths clamps, so it should be Feb 28 (2026 is no leap)
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBeLessThanOrEqual(28);
    });
  });

  // ---------------------------------------------------------------------------
  // Year boundary edge cases
  // ---------------------------------------------------------------------------
  describe("year boundary", () => {
    it("navigateWeek across year boundary", () => {
      const dec29 = new Date(2025, 11, 29); // Monday Dec 29
      const result = navigateWeek(dec29, "next");
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
    });

    it("getMonthDays for January includes Dec days from previous year", () => {
      // January 2026 starts on Thursday
      const days = getMonthDays(new Date(2026, 0, 15));
      const firstDay = days[0];
      // First day should be Sunday of the week containing Jan 1
      // Jan 1, 2026 is Thursday, so the week starts Sunday Dec 28, 2025
      expect(firstDay.getFullYear()).toBe(2025);
      expect(firstDay.getMonth()).toBe(11); // December
    });
  });
});
