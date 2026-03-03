/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
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

jest.mock("@/app/lib/db/models/Calendar", () => {
  const m: Record<string, jest.Mock> = {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
  };
  return { __esModule: true, default: m };
});

jest.mock("@/app/lib/db/models/User", () => {
  const m: Record<string, jest.Mock> = {
    find: jest.fn(),
    findById: jest.fn(),
  };
  return { __esModule: true, default: m };
});

jest.mock("@/app/lib/db/models/Event", () => ({
  __esModule: true,
  default: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }) },
}));

import { getSession } from "@/app/lib/utils/session";
import Calendar from "@/app/lib/db/models/Calendar";
import User from "@/app/lib/db/models/User";
import { GET, POST } from "@/app/api/calendars/route";
import { PATCH, DELETE } from "@/app/api/calendars/[id]/route";
import { POST as JOIN_POST } from "@/app/api/calendars/join/route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const MockCalendar = Calendar as unknown as Record<string, jest.Mock>;
const MockUser = User as unknown as Record<string, jest.Mock>;

// ── Fixtures ───────────────────────────────────────────────────────────────

const now = new Date();

const fakeCalendar = {
  _id: { toString: () => "cal-1" },
  userId: MOCK_USER_ID,
  name: "Personal",
  color: "#3B82F6",
  isVisible: true,
  isDefault: true,
  source: "local",
  sourceUrl: undefined,
  members: [],
  isPublicJoinEnabled: false,
  defaultJoinRole: "viewer",
  shareToken: "tok-abc",
  createdAt: now,
  updatedAt: now,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function mockUserLookups() {
  MockUser.find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  });
  MockUser.findById.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Calendars API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserLookups();
  });

  // ─── GET /api/calendars ───────────────────────────────────────────

  describe("GET /api/calendars", () => {
    it("should list user's calendars", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      // The route calls Calendar.find twice (own + shared)
      MockCalendar.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([fakeCalendar]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

      const { status, body } = await parseResponse(await GET());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.calendars).toHaveLength(1);
      expect(body.data.calendars[0].name).toBe("Personal");
    });

    it("should auto-create default calendar when none exist", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      MockCalendar.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        });

      MockCalendar.create.mockResolvedValue({
        toObject: () => fakeCalendar,
      });

      const { status } = await parseResponse(await GET());

      expect(status).toBe(200);
      expect(MockCalendar.create).toHaveBeenCalled();
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const { status } = await parseResponse(await GET());

      expect(status).toBe(401);
    });
  });

  // ─── POST /api/calendars ──────────────────────────────────────────

  describe("POST /api/calendars", () => {
    it("should create a new calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.create.mockResolvedValue({
        _id: { toString: () => "cal-new" },
        userId: MOCK_USER_ID,
        name: "Work",
        color: "#EF4444",
        isVisible: true,
        isDefault: false,
        source: "local",
        members: [],
        isPublicJoinEnabled: false,
        defaultJoinRole: "viewer",
        shareToken: undefined,
        createdAt: now,
        updatedAt: now,
      });

      const req = buildJsonRequest("POST", "/api/calendars", {
        name: "Work",
        color: "#EF4444",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.calendar.name).toBe("Work");
    });

    it("should reject calendar with missing name", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/calendars", {
        color: "#EF4444",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject calendar with name exceeding 100 characters", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/calendars", {
        name: "A".repeat(101),
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildJsonRequest("POST", "/api/calendars", { name: "X" });
      const { status } = await parseResponse(await POST(req));

      expect(status).toBe(401);
    });
  });

  // ─── PATCH /api/calendars/[id] ───────────────────────────────────

  describe("PATCH /api/calendars/[id]", () => {
    it("should update calendar name and color (owner)", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const saveable = {
        ...fakeCalendar,
        save: jest.fn().mockResolvedValue({
          ...fakeCalendar,
          name: "Updated",
          color: "#22C55E",
        }),
      };
      MockCalendar.findById.mockResolvedValue(saveable);

      const req = buildJsonRequest("PATCH", "/api/calendars/cal-1", {
        name: "Updated",
        color: "#22C55E",
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "cal-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findById.mockResolvedValue(null);

      const req = buildJsonRequest("PATCH", "/api/calendars/bad", {
        name: "X",
      });

      const { status } = await parseResponse(
        await PATCH(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });

    it("should deny non-member from updating", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findById.mockResolvedValue({
        ...fakeCalendar,
        userId: MOCK_USER_ID_2,
        members: [],
      });

      const req = buildJsonRequest("PATCH", "/api/calendars/cal-1", {
        name: "Hacked",
      });

      const { status } = await parseResponse(
        await PATCH(req, buildParams({ id: "cal-1" }))
      );

      expect(status).toBe(404);
    });
  });

  // ─── DELETE /api/calendars/[id] ──────────────────────────────────

  describe("DELETE /api/calendars/[id]", () => {
    it("should delete a non-default calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const nonDefault = { ...fakeCalendar, isDefault: false };
      MockCalendar.findById.mockResolvedValue(nonDefault);
      MockCalendar.findByIdAndDelete.mockResolvedValue(nonDefault);

      const req = buildJsonRequest("DELETE", "/api/calendars/cal-1");
      const { status, body } = await parseResponse(
        await DELETE(req, buildParams({ id: "cal-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should prevent deleting default calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findById.mockResolvedValue(fakeCalendar); // isDefault = true

      const req = buildJsonRequest("DELETE", "/api/calendars/cal-1");
      const { status, body } = await parseResponse(
        await DELETE(req, buildParams({ id: "cal-1" }))
      );

      expect(status).toBe(400);
      expect(body.error).toContain("default");
    });

    it("should allow member to leave a shared calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const sharedCal = {
        ...fakeCalendar,
        userId: MOCK_USER_ID_2,
        members: [{ userId: MOCK_USER_ID, role: "viewer" }],
      };
      MockCalendar.findById.mockResolvedValue(sharedCal);
      MockCalendar.findByIdAndUpdate.mockResolvedValue(sharedCal);

      const req = buildJsonRequest("DELETE", "/api/calendars/cal-1");
      const { status, body } = await parseResponse(
        await DELETE(req, buildParams({ id: "cal-1" }))
      );

      expect(status).toBe(200);
      expect(body.message).toContain("Left");
    });

    it("should return 404 for non-existent calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findById.mockResolvedValue(null);

      const req = buildJsonRequest("DELETE", "/api/calendars/bad");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });
  });

  // ─── POST /api/calendars/join ────────────────────────────────────

  describe("POST /api/calendars/join", () => {
    it("should join a shared calendar via token", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findOne.mockResolvedValue({
        _id: { toString: () => "cal-shared" },
        userId: MOCK_USER_ID_2,
        name: "Shared Cal",
        isPublicJoinEnabled: true,
        defaultJoinRole: "viewer",
        members: [],
      });
      MockCalendar.findByIdAndUpdate.mockResolvedValue(undefined);

      const req = buildJsonRequest("POST", "/api/calendars/join", {
        token: "share-tok-123",
      });

      const { status, body } = await parseResponse(await JOIN_POST(req));

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.calendarName).toBe("Shared Cal");
    });

    it("should reject join when public join is disabled", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findOne.mockResolvedValue({
        _id: "cal-priv",
        userId: MOCK_USER_ID_2,
        isPublicJoinEnabled: false,
        members: [],
      });

      const req = buildJsonRequest("POST", "/api/calendars/join", {
        token: "tok-priv",
      });

      const { status } = await parseResponse(await JOIN_POST(req));

      expect(status).toBe(403);
    });

    it("should reject joining own calendar", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findOne.mockResolvedValue({
        _id: "cal-own",
        userId: MOCK_USER_ID,
        isPublicJoinEnabled: true,
        members: [],
      });

      const req = buildJsonRequest("POST", "/api/calendars/join", {
        token: "tok-own",
      });

      const { status } = await parseResponse(await JOIN_POST(req));

      expect(status).toBe(400);
    });

    it("should reject duplicate membership", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findOne.mockResolvedValue({
        _id: "cal-dup",
        userId: MOCK_USER_ID_2,
        isPublicJoinEnabled: true,
        members: [{ userId: MOCK_USER_ID, role: "viewer" }],
      });

      const req = buildJsonRequest("POST", "/api/calendars/join", {
        token: "tok-dup",
      });

      const { status } = await parseResponse(await JOIN_POST(req));

      expect(status).toBe(409);
    });

    it("should return 404 for invalid token", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockCalendar.findOne.mockResolvedValue(null);

      const req = buildJsonRequest("POST", "/api/calendars/join", {
        token: "bad-token",
      });

      const { status } = await parseResponse(await JOIN_POST(req));

      expect(status).toBe(404);
    });

    it("should reject missing token", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/calendars/join", {});
      const { status } = await parseResponse(await JOIN_POST(req));

      expect(status).toBe(400);
    });
  });
});
