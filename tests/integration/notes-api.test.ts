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

jest.mock("@/app/lib/db/models/Note", () => {
  const m: Record<string, jest.Mock> = {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findOneAndDelete: jest.fn(),
  };
  return { __esModule: true, default: m };
});

jest.mock("@/app/lib/db/models/Event", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock("@/app/lib/db/models/Calendar", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

// Module imports (after mocks)
import { getSession } from "@/app/lib/utils/session";
import Note from "@/app/lib/db/models/Note";
import { GET, POST } from "@/app/api/notes/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/notes/[id]/route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const MockNote = Note as unknown as Record<string, jest.Mock>;

// ── Fixtures ───────────────────────────────────────────────────────────────

const now = new Date();

const fakeNote = {
  _id: { toString: () => "note-1" },
  userId: { toString: () => MOCK_USER_ID },
  title: "Test Note",
  content: "<p>Hello</p>",
  category: "Work",
  linkedEventId: undefined,
  members: [],
  createdAt: now,
  updatedAt: now,
};

// ── Helpers to build chainable query mocks ─────────────────────────────────

function chainFind(results: unknown[]) {
  MockNote.find.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(results),
      }),
    }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Notes API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/notes ──────────────────────────────────────────────

  describe("POST /api/notes", () => {
    it("should create a new note", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockNote.create.mockResolvedValue({
        ...fakeNote,
        toObject: () => fakeNote,
      });

      const req = buildJsonRequest("POST", "/api/notes", {
        title: "Test Note",
        content: "<p>Hello</p>",
        category: "Work",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.note.title).toBe("Test Note");
      expect(body.data.note.content).toBe("<p>Hello</p>");
    });

    it("should reject note with missing title", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/notes", {
        content: "<p>No title</p>",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject note with missing content", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/notes", {
        title: "Title only",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject note with title exceeding 200 characters", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const req = buildJsonRequest("POST", "/api/notes", {
        title: "A".repeat(201),
        content: "<p>Content</p>",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should create note with linkedEventId", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const linked = {
        ...fakeNote,
        linkedEventId: { toString: () => "event-123" },
      };
      MockNote.create.mockResolvedValue(linked);

      const req = buildJsonRequest("POST", "/api/notes", {
        title: "Event Note",
        content: "<p>Linked note</p>",
        linkedEventId: "event-123",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(201);
      expect(body.data.note.linkedEventId).toBe("event-123");
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildJsonRequest("POST", "/api/notes", {
        title: "Note",
        content: "Text",
      });

      const { status, body } = await parseResponse(await POST(req));

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  // ─── GET /api/notes ───────────────────────────────────────────────

  describe("GET /api/notes", () => {
    it("should fetch all user notes", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainFind([fakeNote]);

      const req = buildGetRequest("/api/notes");
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.notes).toHaveLength(1);
      expect(body.data.notes[0].title).toBe("Test Note");
    });

    it("should return empty array when no notes exist", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainFind([]);

      const req = buildGetRequest("/api/notes");
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.data.notes).toHaveLength(0);
    });

    it("should filter notes by category", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      chainFind([fakeNote]);

      const req = buildGetRequest("/api/notes", { category: "Work" });
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(200);
      expect(body.data.notes).toHaveLength(1);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildGetRequest("/api/notes");
      const { status, body } = await parseResponse(await GET(req));

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  // ─── GET /api/notes/[id] ─────────────────────────────────────────

  describe("GET /api/notes/[id]", () => {
    it("should fetch a specific note", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockNote.findById.mockResolvedValue(fakeNote);

      const req = buildGetRequest("/api/notes/note-1");
      const { status, body } = await parseResponse(
        await GET_BY_ID(req, buildParams({ id: "note-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.note.title).toBe("Test Note");
    });

    it("should return 404 for non-existent note", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockNote.findById.mockResolvedValue(null);

      const req = buildGetRequest("/api/notes/bad-id");
      const { status, body } = await parseResponse(
        await GET_BY_ID(req, buildParams({ id: "bad-id" }))
      );

      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });

    it("should not fetch notes from other users", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);

      const otherNote = {
        ...fakeNote,
        userId: { toString: () => MOCK_USER_ID_2 },
        members: [],
      };
      MockNote.findById.mockResolvedValue(otherNote);

      const req = buildGetRequest("/api/notes/note-2");
      const { status, body } = await parseResponse(
        await GET_BY_ID(req, buildParams({ id: "note-2" }))
      );

      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ─── PATCH /api/notes/[id] ───────────────────────────────────────

  describe("PATCH /api/notes/[id]", () => {
    it("should update note title", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const saveable = {
        ...fakeNote,
        save: jest.fn().mockResolvedValue(undefined),
      };
      MockNote.findById.mockResolvedValue(saveable);

      const req = buildJsonRequest("PATCH", "/api/notes/note-1", {
        title: "Updated Title",
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "note-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(saveable.save).toHaveBeenCalled();
    });

    it("should update note content", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const saveable = {
        ...fakeNote,
        save: jest.fn().mockResolvedValue(undefined),
      };
      MockNote.findById.mockResolvedValue(saveable);

      const req = buildJsonRequest("PATCH", "/api/notes/note-1", {
        content: "<p>Updated</p>",
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "note-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should reject viewer from editing", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      const viewerNote = {
        ...fakeNote,
        userId: { toString: () => MOCK_USER_ID_2 },
        members: [{ userId: MOCK_USER_ID, role: "viewer" }],
        save: jest.fn(),
      };
      MockNote.findById.mockResolvedValue(viewerNote);

      const req = buildJsonRequest("PATCH", "/api/notes/note-1", {
        title: "Hacked",
      });

      const { status, body } = await parseResponse(
        await PATCH(req, buildParams({ id: "note-1" }))
      );

      expect(status).toBe(403);
      expect(body.success).toBe(false);
    });

    it("should return 404 for non-existent note", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockNote.findById.mockResolvedValue(null);

      const req = buildJsonRequest("PATCH", "/api/notes/bad", {
        title: "X",
      });

      const { status } = await parseResponse(
        await PATCH(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });
  });

  // ─── DELETE /api/notes/[id] ──────────────────────────────────────

  describe("DELETE /api/notes/[id]", () => {
    it("should delete a note", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockNote.findOneAndDelete.mockResolvedValue(fakeNote);

      const req = buildJsonRequest("DELETE", "/api/notes/note-1");
      const { status, body } = await parseResponse(
        await DELETE(req, buildParams({ id: "note-1" }))
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent note", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      MockNote.findOneAndDelete.mockResolvedValue(null);

      const req = buildJsonRequest("DELETE", "/api/notes/bad");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "bad" }))
      );

      expect(status).toBe(404);
    });

    it("should not delete notes from other users", async () => {
      mockedGetSession.mockResolvedValue(mockSession as never);
      // findOneAndDelete uses { _id, userId } filter so it returns null
      MockNote.findOneAndDelete.mockResolvedValue(null);

      const req = buildJsonRequest("DELETE", "/api/notes/note-2");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "note-2" }))
      );

      expect(status).toBe(404);
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const req = buildJsonRequest("DELETE", "/api/notes/note-1");
      const { status } = await parseResponse(
        await DELETE(req, buildParams({ id: "note-1" }))
      );

      expect(status).toBe(401);
    });
  });
});
