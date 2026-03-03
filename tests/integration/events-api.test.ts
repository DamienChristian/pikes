/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  buildGetRequest,
  buildJsonRequest,
  buildParams,
  parseResponse,
  MOCK_USER_ID,
  MOCK_USER_ID_2,
  mockSession,
} from "../helpers/api-test-helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/app/lib/utils/session", () => ({
  getSession: jest.fn(),
}));
jest.mock("@/app/lib/db/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/app/lib/utils/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({
    success: true,
    remaining: 9,
    resetTime: Date.now() + 60000,
  }),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}));

jest.mock("@/app/lib/db/models/Event", () => {
  const m: Record<string, jest.Mock> = {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
  };
  return { __esModule: true, default: m };
});

jest.mock("@/app/lib/db/models/Calendar", () => {
  const m: Record<string, jest.Mock> = {
    find: jest.fn(),
    findById: jest.fn(),
  };
  return { __esModule: true, default: m };
});

import { getSession } from "@/app/lib/utils/session";
import Event from "@/app/lib/db/models/Event";
import Calendar from "@/app/lib/db/models/Calendar";
import { GET, POST } from "@/app/api/events/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/events/[id]/route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const MockEvent = Event as unknown as Record<string, jest.Mock>;
const MockCalendar = Calendar as unknown as Record<string, jest.Mock>;

// ── Fixtures ───────────────────────────────────────────────────────────────

const now = new Date();
const later = new Date(Date.now() + 3600000);

const fakeEvent = {
  _id: { toString: () => "evt-1" },
  userId: MOCK_USER_ID,
  title: "Team Meeting",
  description: "Weekly sync",
  startDate: now,
  endDate: later,
  allDay: false,
  color: "#3B82F6",
  location: "Room A",
  type: "event",
  deadline: undefined,
  completed: false,
  category: "Work",
  priority: "medium",
  isRecurring: false,
  recurrencePattern: undefined,
  recurrenceInterval: undefined,
  recurrenceDaysOfWeek: undefined,
  recurrenceDayOfMonth: undefined,
  recurrenceEndDate: undefined,
  recurrenceCount: undefined,
  parentEventId: undefined,
  originalDate: undefined,
  calendarId: undefined,
  members: [],
  createdAt: now,
  updatedAt: now,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function chainEventsFind(results: unknown[], total = results.length) {
  MockEvent.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(results),
        }),
      }),
    }),
  });
  MockEvent.countDocuments.mockResolvedValue(total);
}

function chainCalendarFind(results: unknown[]) {
  MockCalendar.find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(results),
    }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Events API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chainCalendarFind([]);
  });

  // ─── GET /api/events ──────────────────────────────────────────────

  describe("GET /api/events", () => {
    it("should fetch events for authenticated user", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainEventsFind([fakeEvent], 1);

      const req = buildGetRequest("/api/events");
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.events).toHaveLength(1);
      expect(body.data.events[0].title).toBe("Team Meeting");
    });

    it("should support date range filtering", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainEventsFind([fakeEvent], 1);

      const start = new Date(Date.now() - 86400000).toISOString();
      const end = new Date(Date.now() + 86400000).toISOString();
      const req = buildGetRequest("/api/events", { start, end });
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.data.events).toHaveLength(1);
    });

    it("should include pagination metadata", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainEventsFind([fakeEvent], 50);

      const req = buildGetRequest("/api/events", { page: "2", limit: "10" });
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.data.pagination).toBeDefined();
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.total).toBe(50);
      expect(body.data.pagination.totalPages).toBe(5);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildGetRequest("/api/events");
      const { status } = await parseResponse(await GET(req));

      expect(status).toBe(401);
    });
  });

  // ─── POST /api/events ─────────────────────────────────────────────

  describe("POST /api/events", () => {
    it("should create a new event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.create.mockResolvedValue(fakeEvent);

      const req = buildJsonRequest("POST", "/api/events", {
        title: "Team Meeting",
        description: "Weekly sync",
        startDate: now.toISOString(),
        endDate: later.toISOString(),
        category: "Work",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.event.title).toBe("Team Meeting");
    });

    it("should reject event without title", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/events", {
        startDate: now.toISOString(),
        endDate: later.toISOString(),
      });

      const { status } = await parseResponse(await POST(req));

      expect(status).toBe(400);
    });

    it("should reject event where end date is before start date", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const yesterday = new Date(Date.now() - 86400000);
      const req = buildJsonRequest("POST", "/api/events", {
        title: "Bad Event",
        startDate: now.toISOString(),
        endDate: yesterday.toISOString(),
      });

      const { status } = await parseResponse(await POST(req));

      expect(status).toBe(400);
    });

    it("should create event with all optional fields", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const fullEvent = {
        ...fakeEvent,
        isRecurring: true,
        recurrencePattern: "weekly",
      };
      MockEvent.create.mockResolvedValue(fullEvent);

      const req = buildJsonRequest("POST", "/api/events", {
        title: "Recurring Meeting",
        startDate: now.toISOString(),
        endDate: later.toISOString(),
        location: "Room A",
        category: "Work",
        priority: "high",
        isRecurring: true,
        recurrencePattern: "weekly",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(201);
      expect(body.success).toBe(true);
    });

    it("should reject event on calendar without editor access", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "cal-1",
          userId: MOCK_USER_ID_2,
          members: [{ userId: MOCK_USER_ID, role: "viewer" }],
        }),
      });

      const req = buildJsonRequest("POST", "/api/events", {
        title: "Blocked Event",
        startDate: now.toISOString(),
        endDate: later.toISOString(),
        calendarId: "cal-1",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(403);
      expect(body.success).toBe(false);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildJsonRequest("POST", "/api/events", {
        title: "X",
        startDate: now.toISOString(),
        endDate: later.toISOString(),
      });

      const { status } = await parseResponse(await POST(req));

      expect(status).toBe(401);
    });
  });

  // ─── GET /api/events/[id] ────────────────────────────────────────

  describe("GET /api/events/[id]", () => {
    it("should fetch a specific event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(fakeEvent),
      });

      const req = buildGetRequest("/api/events/evt-1");
      const { status, body } = await parseResponse(
        await GET_BY_ID(req, buildParams({ id: "evt-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.event.title).toBe("Team Meeting");
    });

    it("should return 404 for non-existent event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = buildGetRequest("/api/events/bad");
      const { status } = await parseResponse(
        await GET_BY_ID(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });

    it("should deny access to events owned by other users", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          ...fakeEvent,
          userId: MOCK_USER_ID_2,
          members: [],
          calendarId: undefined,
        }),
      });

      const req = buildGetRequest("/api/events/evt-2");
      const { status } = await parseResponse(
        await GET_BY_ID(req, buildParams({ id: "evt-2" }))
      );

      expect(status).toBe(404);
    });
  });

  // ─── PATCH /api/events/[id] ──────────────────────────────────────

  describe("PATCH /api/events/[id]", () => {
    it("should update an event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(fakeEvent),
      });
      const updated = { ...fakeEvent, title: "Updated Meeting" };
      MockEvent.findByIdAndUpdate.mockResolvedValue(updated);

      const req = buildJsonRequest("PATCH", "/api/events/evt-1", {
        title: "Updated Meeting",
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "evt-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.event.title).toBe("Updated Meeting");
    });

    it("should reject viewer from editing", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const sharedEvent = {
        ...fakeEvent,
        userId: MOCK_USER_ID_2,
        members: [{ userId: MOCK_USER_ID, role: "viewer" }],
      };
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(sharedEvent),
      });

      const req = buildJsonRequest("PATCH", "/api/events/evt-1", {
        title: "Hacked",
      });

      const { status } = await parseResponse(
        await PATCH(req, buildParams({ id: "evt-1" }))
      );

      expect(status).toBe(403);
    });

    it("should return 404 for non-existent event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = buildJsonRequest("PATCH", "/api/events/bad", {
        title: "X",
      });

      const { status } = await parseResponse(
        await PATCH(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });
  });

  // ─── DELETE /api/events/[id] ─────────────────────────────────────

  describe("DELETE /api/events/[id]", () => {
    it("should delete an event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(fakeEvent),
        })
        .mockResolvedValueOnce({ ...fakeEvent, isRecurring: false });
      MockEvent.findByIdAndDelete.mockResolvedValue(fakeEvent);

      const req = buildJsonRequest("DELETE", "/api/events/evt-1");
      const { status, body } = await parseResponse(
        await DELETE(req, buildParams({ id: "evt-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should delete recurring parent and all children", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const recurringEvent = { ...fakeEvent, isRecurring: true };
      MockEvent.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(recurringEvent),
        })
        .mockResolvedValueOnce(recurringEvent);
      MockEvent.findByIdAndDelete.mockResolvedValue(recurringEvent);
      MockEvent.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const req = buildJsonRequest("DELETE", "/api/events/evt-1");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "evt-1" }))
      );

      expect(status).toBe(200);
      expect(MockEvent.deleteMany).toHaveBeenCalledWith({
        parentEventId: "evt-1",
      });
    });

    it("should return 404 for non-existent event", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = buildJsonRequest("DELETE", "/api/events/bad");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });

    it("should reject viewer from deleting", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const sharedEvent = {
        ...fakeEvent,
        userId: MOCK_USER_ID_2,
        members: [{ userId: MOCK_USER_ID, role: "viewer" }],
      };
      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(sharedEvent),
      });

      const req = buildJsonRequest("DELETE", "/api/events/evt-1");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "evt-1" }))
      );

      expect(status).toBe(403);
    });
  });
});
