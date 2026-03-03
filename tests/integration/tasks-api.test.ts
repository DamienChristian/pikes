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
import { PATCH, DELETE } from "@/app/api/events/[id]/route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const MockEvent = Event as unknown as Record<string, jest.Mock>;
const MockCalendar = Calendar as unknown as Record<string, jest.Mock>;

// ── Fixtures ───────────────────────────────────────────────────────────────

const now = new Date();
const tomorrow = new Date(Date.now() + 86400000);

const fakeTask = {
  _id: { toString: () => "task-1" },
  userId: MOCK_USER_ID,
  title: "Test Task",
  description: "Task description",
  startDate: now,
  endDate: now,
  allDay: false,
  color: "#3B82F6",
  type: "task",
  deadline: tomorrow,
  completed: false,
  category: "Work",
  priority: "medium",
  isRecurring: false,
  members: [],
  calendarId: undefined,
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

describe("Tasks API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user has no shared calendars
    chainCalendarFind([]);
  });

  // ─── POST /api/events (Task Creation) ─────────────────────────────

  describe("POST /api/events (Task Creation)", () => {
    it("should create a task", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.create.mockResolvedValue(fakeTask);

      const req = buildJsonRequest("POST", "/api/events", {
        title: "Test Task",
        description: "Task description",
        type: "task",
        startDate: now.toISOString(),
        endDate: now.toISOString(),
        deadline: tomorrow.toISOString(),
        category: "Work",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.event.type).toBe("task");
      expect(body.data.event.title).toBe("Test Task");
    });

    it("should reject task without title", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/events", {
        type: "task",
        startDate: now.toISOString(),
        endDate: now.toISOString(),
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject task where end date is before start date", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const yesterday = new Date(Date.now() - 86400000);
      const req = buildJsonRequest("POST", "/api/events", {
        title: "Bad Task",
        type: "task",
        startDate: now.toISOString(),
        endDate: yesterday.toISOString(),
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildJsonRequest("POST", "/api/events", {
        title: "Task",
        type: "task",
        startDate: now.toISOString(),
        endDate: now.toISOString(),
      });

      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(401);
    });
  });

  // ─── PATCH /api/events/[id] (Task Updates) ───────────────────────

  describe("PATCH /api/events/[id] (Task Updates)", () => {
    it("should mark task as completed", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(fakeTask),
      });
      MockCalendar.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const updated = { ...fakeTask, completed: true };
      MockEvent.findByIdAndUpdate.mockResolvedValue(updated);

      const req = buildJsonRequest("PATCH", "/api/events/task-1", {
        completed: true,
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "task-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.event.completed).toBe(true);
    });

    it("should update task deadline", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(fakeTask),
      });

      const newDeadline = new Date(Date.now() + 172800000);
      const updated = { ...fakeTask, deadline: newDeadline };
      MockEvent.findByIdAndUpdate.mockResolvedValue(updated);

      const req = buildJsonRequest("PATCH", "/api/events/task-1", {
        deadline: newDeadline.toISOString(),
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "task-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should update task category", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(fakeTask),
      });

      const updated = { ...fakeTask, category: "Personal" };
      MockEvent.findByIdAndUpdate.mockResolvedValue(updated);

      const req = buildJsonRequest("PATCH", "/api/events/task-1", {
        category: "Personal",
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "task-1" }))
      );

      expect(status).toBe(200);
      expect(body.data.event.category).toBe("Personal");
    });

    it("should return 404 for non-existent task", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      MockEvent.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = buildJsonRequest("PATCH", "/api/events/bad", {
        completed: true,
      });

      const { status } = await parseResponse(
        await PATCH(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });
  });

  // ─── GET /api/events (Task Filtering) ─────────────────────────────

  describe("GET /api/events (Task Filtering)", () => {
    it("should fetch events (including tasks)", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainEventsFind([fakeTask], 1);

      const req = buildGetRequest("/api/events");
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.events).toHaveLength(1);
      expect(body.data.events[0].type).toBe("task");
    });

    it("should return empty when no events exist", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainEventsFind([], 0);

      const req = buildGetRequest("/api/events");
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.data.events).toHaveLength(0);
    });

    it("should support pagination", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainEventsFind([fakeTask], 25);

      const req = buildGetRequest("/api/events", { page: "1", limit: "10" });
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.data.pagination.total).toBe(25);
      expect(body.data.pagination.totalPages).toBe(3);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildGetRequest("/api/events");
      const { status } = await parseResponse(await GET(req));

      expect(status).toBe(401);
    });
  });

  // ─── DELETE /api/events/[id] ──────────────────────────────────────

  describe("DELETE /api/events/[id] (Task Deletion)", () => {
    it("should delete a task", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      MockEvent.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(fakeTask),
        })
        .mockResolvedValueOnce({ ...fakeTask, isRecurring: false });
      MockEvent.findByIdAndDelete.mockResolvedValue(fakeTask);

      const req = buildJsonRequest("DELETE", "/api/events/task-1");
      const { status, body } = await parseResponse(
        await DELETE(req, buildParams({ id: "task-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent task", async () => {
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
  });
});
