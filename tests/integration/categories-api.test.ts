/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { parseResponse, mockSession } from "../helpers/api-test-helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/app/lib/utils/session", () => ({
  getSession: jest.fn(),
}));
jest.mock("@/app/lib/db/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/app/lib/db/models/Event", () => ({
  __esModule: true,
  default: { distinct: jest.fn() },
}));

import { getSession } from "@/app/lib/utils/session";
import Event from "@/app/lib/db/models/Event";
import { GET } from "@/app/api/categories/route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const MockEvent = Event as unknown as { distinct: jest.Mock };

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Categories API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("should return sorted categories", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.distinct.mockResolvedValue(["Work", "Personal", "Health"]);

      const { status, body } = await parseResponse(await GET());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.categories).toEqual(["Health", "Personal", "Work"]);
    });

    it("should return empty array when no categories exist", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockEvent.distinct.mockResolvedValue([]);

      const { status, body } = await parseResponse(await GET());

      expect(status).toBe(200);
      expect(body.data.categories).toEqual([]);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const { status, body } = await parseResponse(await GET());

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });
  });
});
