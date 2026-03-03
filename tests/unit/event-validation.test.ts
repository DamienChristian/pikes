import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  dateRangeSchema,
  paginationSchema,
} from "@/app/lib/validations/event";

describe("Event Validation Schemas", () => {
  // ---------------------------------------------------------------------------
  // createEventSchema
  // ---------------------------------------------------------------------------
  describe("createEventSchema", () => {
    const validEvent = {
      title: "Team Meeting",
      startDate: "2026-03-10T10:00:00Z",
      endDate: "2026-03-10T11:00:00Z",
    };

    it("accepts minimal valid event", () => {
      const result = createEventSchema.parse(validEvent);
      expect(result.title).toBe("Team Meeting");
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.type).toBe("event"); // default
      expect(result.priority).toBe("medium"); // default
      expect(result.allDay).toBe(false); // default
      expect(result.completed).toBe(false); // default
    });

    it("accepts event with all optional fields", () => {
      const full = {
        ...validEvent,
        description: "Discuss Q2 goals",
        allDay: true,
        color: "#FF5733",
        location: "Room 5",
        type: "task" as const,
        deadline: "2026-03-15T23:59:59Z",
        completed: true,
        category: "work",
        priority: "high" as const,
        isRecurring: true,
        recurrencePattern: "weekly" as const,
        recurrenceInterval: 2,
        recurrenceDaysOfWeek: [1, 3, 5],
        recurrenceEndDate: "2026-06-10T00:00:00Z",
        calendarId: "cal_123",
      };
      const result = createEventSchema.parse(full);
      expect(result.type).toBe("task");
      expect(result.priority).toBe("high");
      expect(result.recurrenceDaysOfWeek).toEqual([1, 3, 5]);
      expect(result.recurrenceInterval).toBe(2);
    });

    // --- title ---
    it("rejects empty title", () => {
      expect(() =>
        createEventSchema.parse({ ...validEvent, title: "" })
      ).toThrow();
    });

    it("rejects title longer than 100 characters", () => {
      expect(() =>
        createEventSchema.parse({ ...validEvent, title: "T".repeat(101) })
      ).toThrow();
    });

    it("trims whitespace from title", () => {
      const result = createEventSchema.parse({
        ...validEvent,
        title: "  Trimmed  ",
      });
      expect(result.title).toBe("Trimmed");
    });

    // --- dates ---
    it("coerces ISO date strings to Date objects", () => {
      const result = createEventSchema.parse(validEvent);
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it("rejects when end date is before start date", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          startDate: "2026-03-10T12:00:00Z",
          endDate: "2026-03-10T10:00:00Z",
        })
      ).toThrow();
    });

    it("accepts when end date equals start date", () => {
      const result = createEventSchema.parse({
        ...validEvent,
        startDate: "2026-03-10T10:00:00Z",
        endDate: "2026-03-10T10:00:00Z",
      });
      expect(result.startDate.getTime()).toBe(result.endDate.getTime());
    });

    // --- color ---
    it("accepts valid hex color", () => {
      const result = createEventSchema.parse({
        ...validEvent,
        color: "#AABB11",
      });
      expect(result.color).toBe("#AABB11");
    });

    it("rejects invalid color format", () => {
      expect(() =>
        createEventSchema.parse({ ...validEvent, color: "red" })
      ).toThrow();
      expect(() =>
        createEventSchema.parse({ ...validEvent, color: "#GGG000" })
      ).toThrow();
      expect(() =>
        createEventSchema.parse({ ...validEvent, color: "#FFF" })
      ).toThrow();
    });

    // --- description ---
    it("rejects description longer than 500 characters", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          description: "D".repeat(501),
        })
      ).toThrow();
    });

    // --- location ---
    it("rejects location longer than 200 characters", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          location: "L".repeat(201),
        })
      ).toThrow();
    });

    // --- type ---
    it("defaults type to 'event'", () => {
      const result = createEventSchema.parse(validEvent);
      expect(result.type).toBe("event");
    });

    it("accepts 'task' type", () => {
      const result = createEventSchema.parse({ ...validEvent, type: "task" });
      expect(result.type).toBe("task");
    });

    it("rejects invalid type", () => {
      expect(() =>
        createEventSchema.parse({ ...validEvent, type: "meeting" })
      ).toThrow();
    });

    // --- priority ---
    it("accepts low / medium / high priority", () => {
      for (const p of ["low", "medium", "high"] as const) {
        const result = createEventSchema.parse({ ...validEvent, priority: p });
        expect(result.priority).toBe(p);
      }
    });

    it("rejects invalid priority", () => {
      expect(() =>
        createEventSchema.parse({ ...validEvent, priority: "urgent" })
      ).toThrow();
    });

    // --- recurrence ---
    it("accepts valid recurrence patterns", () => {
      for (const p of ["daily", "weekly", "monthly", "yearly", "custom"]) {
        const result = createEventSchema.parse({
          ...validEvent,
          isRecurring: true,
          recurrencePattern: p,
        });
        expect(result.recurrencePattern).toBe(p);
      }
    });

    it("rejects invalid recurrence pattern", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrencePattern: "biweekly",
        })
      ).toThrow();
    });

    it("rejects non-positive recurrence interval", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrenceInterval: 0,
        })
      ).toThrow();
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrenceInterval: -1,
        })
      ).toThrow();
    });

    it("rejects invalid recurrence days of week values", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrenceDaysOfWeek: [7],
        })
      ).toThrow();
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrenceDaysOfWeek: [-1],
        })
      ).toThrow();
    });

    it("rejects invalid recurrence day of month", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrenceDayOfMonth: 0,
        })
      ).toThrow();
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          recurrenceDayOfMonth: 32,
        })
      ).toThrow();
    });

    // --- category ---
    it("rejects category longer than 50 characters", () => {
      expect(() =>
        createEventSchema.parse({
          ...validEvent,
          category: "C".repeat(51),
        })
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // updateEventSchema
  // ---------------------------------------------------------------------------
  describe("updateEventSchema", () => {
    it("requires an id", () => {
      expect(() => updateEventSchema.parse({ title: "Updated" })).toThrow();
    });

    it("accepts id + no other changes (all optional)", () => {
      const result = updateEventSchema.parse({ id: "evt_1" });
      expect(result.id).toBe("evt_1");
      expect(result.title).toBeUndefined();
    });

    it("accepts id + partial update", () => {
      const result = updateEventSchema.parse({
        id: "evt_1",
        title: "Renamed",
        priority: "high",
      });
      expect(result.title).toBe("Renamed");
      expect(result.priority).toBe("high");
    });

    it("rejects when endDate < startDate (both provided)", () => {
      expect(() =>
        updateEventSchema.parse({
          id: "evt_1",
          startDate: "2026-03-10T12:00:00Z",
          endDate: "2026-03-10T10:00:00Z",
        })
      ).toThrow();
    });

    it("allows endDate without startDate (no cross-field check)", () => {
      const result = updateEventSchema.parse({
        id: "evt_1",
        endDate: "2026-03-10T10:00:00Z",
      });
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it("rejects empty id", () => {
      expect(() => updateEventSchema.parse({ id: "" })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // eventIdSchema
  // ---------------------------------------------------------------------------
  describe("eventIdSchema", () => {
    it("accepts valid id", () => {
      expect(eventIdSchema.parse({ id: "abc123" }).id).toBe("abc123");
    });

    it("rejects empty id", () => {
      expect(() => eventIdSchema.parse({ id: "" })).toThrow();
    });

    it("rejects missing id", () => {
      expect(() => eventIdSchema.parse({})).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // dateRangeSchema
  // ---------------------------------------------------------------------------
  describe("dateRangeSchema", () => {
    it("coerces ISO strings to dates", () => {
      const result = dateRangeSchema.parse({
        start: "2026-01-01",
        end: "2026-01-31",
      });
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });

    it("rejects invalid date values", () => {
      expect(() =>
        dateRangeSchema.parse({ start: "not-a-date", end: "2026-01-31" })
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // paginationSchema
  // ---------------------------------------------------------------------------
  describe("paginationSchema", () => {
    it("returns defaults when no params given", () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("coerces string numbers", () => {
      const result = paginationSchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("rejects page <= 0", () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    it("rejects limit > 100", () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    });

    it("rejects non-integer values", () => {
      expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
    });
  });
});
