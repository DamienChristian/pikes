import {
  eventToICS,
  eventsToICS,
  parseICS,
  parseICSWithMeta,
} from "@/app/lib/utils/ics";
import { CalendarEvent } from "@/app/types";

// Helper to build a minimal CalendarEvent
function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt_1",
    title: "Test Event",
    startDate: new Date("2026-03-10T10:00:00Z"),
    endDate: new Date("2026-03-10T11:00:00Z"),
    allDay: false,
    userId: "user_1",
    members: [],
    type: "event",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("ICS Utilities", () => {
  // ---------------------------------------------------------------------------
  // eventToICS
  // ---------------------------------------------------------------------------
  describe("eventToICS", () => {
    it("produces a valid VEVENT block", () => {
      const ics = eventToICS(makeEvent());
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("SUMMARY:Test Event");
      expect(ics).toContain("UID:evt_1@calendar.app");
    });

    it("formats timed dates as UTC (YYYYMMDDTHHMMSSZ)", () => {
      const ics = eventToICS(makeEvent());
      expect(ics).toContain("DTSTART:20260310T100000Z");
      expect(ics).toContain("DTEND:20260310T110000Z");
    });

    it("formats all-day dates as VALUE=DATE", () => {
      // Use local-time constructor so date-fns format() produces the expected date
      const ics = eventToICS(
        makeEvent({
          allDay: true,
          startDate: new Date(2026, 2, 10), // March 10 in local time
          endDate: new Date(2026, 2, 11), // March 11 in local time
        })
      );
      expect(ics).toContain("DTSTART;VALUE=DATE:20260310");
      expect(ics).toContain("DTEND;VALUE=DATE:20260311");
    });

    it("includes optional description", () => {
      const ics = eventToICS(makeEvent({ description: "Hello world" }));
      expect(ics).toContain("DESCRIPTION:Hello world");
    });

    it("includes optional location", () => {
      const ics = eventToICS(makeEvent({ location: "Room 42" }));
      expect(ics).toContain("LOCATION:Room 42");
    });

    it("includes category from event and calendar name", () => {
      const ics = eventToICS(makeEvent({ category: "work" }), "Personal");
      expect(ics).toContain("CATEGORIES:work,Personal");
    });

    it("maps priority to RFC 5545 values", () => {
      expect(eventToICS(makeEvent({ priority: "high" }))).toContain(
        "PRIORITY:1"
      );
      expect(eventToICS(makeEvent({ priority: "medium" }))).toContain(
        "PRIORITY:5"
      );
      expect(eventToICS(makeEvent({ priority: "low" }))).toContain(
        "PRIORITY:9"
      );
    });

    it("includes STATUS for tasks", () => {
      const completed = eventToICS(
        makeEvent({ type: "task", completed: true })
      );
      expect(completed).toContain("STATUS:COMPLETED");

      const pending = eventToICS(makeEvent({ type: "task", completed: false }));
      expect(pending).toContain("STATUS:NEEDS-ACTION");
    });

    it("includes DUE for tasks with deadline", () => {
      const ics = eventToICS(
        makeEvent({
          type: "task",
          deadline: new Date("2026-03-15T23:59:00Z"),
        })
      );
      expect(ics).toContain("DUE:20260315T235900Z");
    });

    it("includes RRULE for recurring events", () => {
      const ics = eventToICS(
        makeEvent({
          isRecurring: true,
          recurrencePattern: "weekly",
          recurrenceInterval: 2,
          recurrenceDaysOfWeek: [1, 3, 5],
        })
      );
      expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR");
    });

    it("includes RRULE UNTIL for recurring with end date", () => {
      const ics = eventToICS(
        makeEvent({
          isRecurring: true,
          recurrencePattern: "daily",
          recurrenceEndDate: new Date("2026-06-01T00:00:00Z"),
        })
      );
      expect(ics).toContain("RRULE:FREQ=DAILY;UNTIL=20260601T000000Z");
    });

    it("includes RRULE COUNT", () => {
      const ics = eventToICS(
        makeEvent({
          isRecurring: true,
          recurrencePattern: "monthly",
          recurrenceCount: 12,
        })
      );
      expect(ics).toContain("RRULE:FREQ=MONTHLY;COUNT=12");
    });

    it("escapes special characters in text fields", () => {
      const ics = eventToICS(
        makeEvent({
          title: "Meeting; with, commas\\and back\\slashes",
          description: "Line1\nLine2",
        })
      );
      expect(ics).toContain(
        "SUMMARY:Meeting\\; with\\, commas\\\\and back\\\\slashes"
      );
      expect(ics).toContain("DESCRIPTION:Line1\\nLine2");
    });
  });

  // ---------------------------------------------------------------------------
  // eventsToICS
  // ---------------------------------------------------------------------------
  describe("eventsToICS", () => {
    it("produces a complete VCALENDAR with header and footer", () => {
      const ics = eventsToICS([makeEvent()]);
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
    });

    it("uses provided calendarName", () => {
      const ics = eventsToICS([makeEvent()], { calendarName: "Work" });
      expect(ics).toContain("X-WR-CALNAME:Work");
    });

    it("defaults X-WR-CALNAME to 'My Calendar'", () => {
      const ics = eventsToICS([makeEvent()]);
      expect(ics).toContain("X-WR-CALNAME:My Calendar");
    });

    it("includes multiple events", () => {
      const events = [
        makeEvent({ id: "1", title: "First" }),
        makeEvent({ id: "2", title: "Second" }),
      ];
      const ics = eventsToICS(events);
      expect(ics).toContain("SUMMARY:First");
      expect(ics).toContain("SUMMARY:Second");
    });

    it("uses calendarMap for per-event CATEGORIES", () => {
      const events = [
        makeEvent({ id: "1", calendarId: "cal_a", category: "work" }),
        makeEvent({ id: "2", calendarId: "cal_b" }),
      ];
      const ics = eventsToICS(events, {
        calendarMap: { cal_a: "Work Cal", cal_b: "Personal" },
      });
      expect(ics).toContain("CATEGORIES:work,Work Cal");
      expect(ics).toContain("CATEGORIES:Personal");
    });
  });

  // ---------------------------------------------------------------------------
  // parseICS
  // ---------------------------------------------------------------------------
  describe("parseICS", () => {
    const minimalICS = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "SUMMARY:Parsed Event",
      "DTSTART:20260310T100000Z",
      "DTEND:20260310T110000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    it("parses a minimal ICS event", () => {
      const events = parseICS(minimalICS);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Parsed Event");
      expect(events[0].startDate).toEqual(new Date("2026-03-10T10:00:00Z"));
      expect(events[0].endDate).toEqual(new Date("2026-03-10T11:00:00Z"));
      expect(events[0].allDay).toBe(false);
    });

    it("parses all-day events", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:All Day",
        "DTSTART;VALUE=DATE:20260310",
        "DTEND;VALUE=DATE:20260311",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events[0].allDay).toBe(true);
      expect(events[0].startDate.getFullYear()).toBe(2026);
      expect(events[0].startDate.getMonth()).toBe(2); // March
      expect(events[0].startDate.getDate()).toBe(10);
    });

    it("parses description, location, category", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Full Event",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "DESCRIPTION:Some details\\nwith newline",
        "LOCATION:Room 42",
        "CATEGORIES:Work,Personal",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events[0].description).toBe("Some details\nwith newline");
      expect(events[0].location).toBe("Room 42");
      expect(events[0].category).toBe("Work"); // first category
    });

    it("parses priority (RFC 5545 mapping)", () => {
      const make = (p: string) =>
        [
          "BEGIN:VCALENDAR",
          "BEGIN:VEVENT",
          "SUMMARY:P",
          "DTSTART:20260310T100000Z",
          "DTEND:20260310T110000Z",
          `PRIORITY:${p}`,
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");

      expect(parseICS(make("1"))[0].priority).toBe("high");
      expect(parseICS(make("5"))[0].priority).toBe("medium");
      expect(parseICS(make("9"))[0].priority).toBe("low");
    });

    it("parses RRULE", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Recurring",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=10",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events[0].recurrence).toBeDefined();
      expect(events[0].recurrence!.pattern).toBe("weekly");
      expect(events[0].recurrence!.interval).toBe(2);
      expect(events[0].recurrence!.daysOfWeek).toEqual([1, 3, 5]);
      expect(events[0].recurrence!.count).toBe(10);
    });

    it("parses RRULE UNTIL date", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:UntilRecur",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "RRULE:FREQ=DAILY;UNTIL=20260601T000000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events[0].recurrence!.pattern).toBe("daily");
      expect(events[0].recurrence!.endDate).toEqual(
        new Date("2026-06-01T00:00:00Z")
      );
    });

    it("handles multiple events in one file", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Event 1",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:Event 2",
        "DTSTART:20260311T100000Z",
        "DTEND:20260311T110000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe("Event 1");
      expect(events[1].title).toBe("Event 2");
    });

    it("skips incomplete events (missing title)", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events).toHaveLength(0);
    });

    it("skips events missing start or end date", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:No Dates",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      expect(parseICS(ics)).toHaveLength(0);
    });

    it("handles \\n line endings", () => {
      const ics =
        "BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Unix\nDTSTART:20260310T100000Z\nDTEND:20260310T110000Z\nEND:VEVENT\nEND:VCALENDAR";
      expect(parseICS(ics)).toHaveLength(1);
    });

    it("unescapes ICS text fields correctly", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Semi\\;colon and comma\\, test",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "DESCRIPTION:back\\\\slash\\nnewline",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const events = parseICS(ics);
      expect(events[0].title).toBe("Semi;colon and comma, test");
      expect(events[0].description).toBe("back\\slash\nnewline");
    });
  });

  // ---------------------------------------------------------------------------
  // parseICSWithMeta
  // ---------------------------------------------------------------------------
  describe("parseICSWithMeta", () => {
    it("extracts X-WR-CALNAME", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "X-WR-CALNAME:My Work",
        "BEGIN:VEVENT",
        "SUMMARY:E",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const result = parseICSWithMeta(ics);
      expect(result.calendarName).toBe("My Work");
      expect(result.events).toHaveLength(1);
    });

    it("returns undefined calendarName when absent", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:E",
        "DTSTART:20260310T100000Z",
        "DTEND:20260310T110000Z",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      expect(parseICSWithMeta(ics).calendarName).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Round-trip: eventToICS → parseICS
  // ---------------------------------------------------------------------------
  describe("round-trip", () => {
    it("preserves title, dates, description, location, category", () => {
      const original = makeEvent({
        title: "Round Trip",
        description: "Should survive",
        location: "Building A",
        category: "meetings",
        startDate: new Date("2026-06-15T14:30:00Z"),
        endDate: new Date("2026-06-15T15:30:00Z"),
      });

      const icsStr =
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" +
        eventToICS(original) +
        "\r\nEND:VCALENDAR";

      const parsed = parseICS(icsStr);
      expect(parsed).toHaveLength(1);

      const p = parsed[0];
      expect(p.title).toBe("Round Trip");
      expect(p.description).toBe("Should survive");
      expect(p.location).toBe("Building A");
      expect(p.category).toBe("meetings");
      expect(p.startDate).toEqual(new Date("2026-06-15T14:30:00Z"));
      expect(p.endDate).toEqual(new Date("2026-06-15T15:30:00Z"));
      expect(p.allDay).toBe(false);
    });

    it("preserves all-day flag", () => {
      const original = makeEvent({
        title: "All Day Trip",
        allDay: true,
        startDate: new Date("2026-06-15T00:00:00Z"),
        endDate: new Date("2026-06-16T00:00:00Z"),
      });

      const icsStr =
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" +
        eventToICS(original) +
        "\r\nEND:VCALENDAR";

      const parsed = parseICS(icsStr);
      expect(parsed[0].allDay).toBe(true);
    });

    it("preserves priority through round-trip", () => {
      for (const prio of ["high", "medium", "low"] as const) {
        const original = makeEvent({
          title: `Priority ${prio}`,
          priority: prio,
        });
        const icsStr =
          "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" +
          eventToICS(original) +
          "\r\nEND:VCALENDAR";
        const parsed = parseICS(icsStr);
        expect(parsed[0].priority).toBe(prio);
      }
    });

    it("preserves recurrence through round-trip", () => {
      const original = makeEvent({
        title: "Weekly Standup",
        isRecurring: true,
        recurrencePattern: "weekly",
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [1, 3, 5],
        recurrenceCount: 20,
      });
      const icsStr =
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" +
        eventToICS(original) +
        "\r\nEND:VCALENDAR";
      const parsed = parseICS(icsStr);
      expect(parsed[0].recurrence).toBeDefined();
      expect(parsed[0].recurrence!.pattern).toBe("weekly");
      expect(parsed[0].recurrence!.daysOfWeek).toEqual([1, 3, 5]);
      expect(parsed[0].recurrence!.count).toBe(20);
    });

    it("preserves special characters through round-trip", () => {
      const original = makeEvent({
        title: "Meeting; with, commas",
        description: "Line1\nLine2",
      });
      const icsStr =
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" +
        eventToICS(original) +
        "\r\nEND:VCALENDAR";
      const parsed = parseICS(icsStr);
      expect(parsed[0].title).toBe("Meeting; with, commas");
      expect(parsed[0].description).toBe("Line1\nLine2");
    });
  });
});
