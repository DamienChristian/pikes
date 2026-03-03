/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Mock external dependencies BEFORE importing the module under test ---

// Mock jose (ESM-only)
const mockSign = jest.fn().mockReturnThis();
const mockSetProtectedHeader = jest.fn().mockReturnThis();
const mockSetExpirationTime = jest.fn().mockReturnThis();
const mockSetIssuedAt = jest.fn().mockReturnThis();

jest.mock("jose", () => ({
  SignJWT: jest.fn(() => ({
    setProtectedHeader: mockSetProtectedHeader,
    setExpirationTime: mockSetExpirationTime,
    setIssuedAt: mockSetIssuedAt,
    sign: mockSign,
  })),
  jwtVerify: jest.fn(),
}));

// Mock nanoid (ESM-only)
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "mock-session-id"),
}));

// Mock next/headers cookies
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  })),
}));

// Mock DB connection
jest.mock("@/app/lib/db/mongodb", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock Session model
const mockSessionCreate = jest.fn();
const mockSessionFindOne = jest.fn();
const mockSessionDeleteOne = jest.fn();
const mockSessionDeleteMany = jest.fn();
jest.mock("@/app/lib/db/models/Session", () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockSessionCreate(...args),
    findOne: (...args: unknown[]) => mockSessionFindOne(...args),
    deleteOne: (...args: unknown[]) => mockSessionDeleteOne(...args),
    deleteMany: (...args: unknown[]) => mockSessionDeleteMany(...args),
  },
}));

// Mock User model
const mockUserFindById = jest.fn();
jest.mock("@/app/lib/db/models/User", () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

// Now import the module under test
import {
  createSession,
  verifySession,
  getSession,
  setSessionCookie,
  deleteSession,
  deleteAllUserSessions,
  cleanupExpiredSessions,
} from "@/app/lib/utils/session";
import { jwtVerify } from "jose";

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe("Session Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // createSession
  // ---------------------------------------------------------------------------
  describe("createSession", () => {
    it("creates a session and returns JWT token", async () => {
      mockSign.mockResolvedValueOnce("jwt-token-123");
      mockSessionCreate.mockResolvedValueOnce({});

      const token = await createSession("user_1");

      expect(mockSign).toHaveBeenCalled();
      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user_1",
          token: "mock-session-id",
        })
      );
      expect(token).toBe("jwt-token-123");
    });

    it("uses extended duration when rememberMe is true", async () => {
      mockSign.mockResolvedValueOnce("jwt-token-456");
      mockSessionCreate.mockResolvedValueOnce({});

      await createSession("user_1", true);

      // The session should have an expiresAt further in the future
      const createCall = mockSessionCreate.mock.calls[0][0] as {
        expiresAt: Date;
      };
      const expiresAt = createCall.expiresAt;
      const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
      // Should be close to 30 days (within 5 seconds)
      expect(Math.abs(expiresAt.getTime() - thirtyDaysFromNow)).toBeLessThan(
        5000
      );
    });

    it("uses standard duration when rememberMe is false", async () => {
      mockSign.mockResolvedValueOnce("jwt-token-789");
      mockSessionCreate.mockResolvedValueOnce({});

      await createSession("user_1", false);

      const createCall = mockSessionCreate.mock.calls[0][0] as {
        expiresAt: Date;
      };
      const expiresAt = createCall.expiresAt;
      const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresAt.getTime() - sevenDaysFromNow)).toBeLessThan(
        5000
      );
    });
  });

  // ---------------------------------------------------------------------------
  // verifySession
  // ---------------------------------------------------------------------------
  describe("verifySession", () => {
    const mockUser = {
      _id: { toString: () => "user_1" },
      email: "test@example.com",
      username: "testuser",
      firstName: "John",
      lastName: "Doe",
      avatarUrl: undefined,
      emailVerified: true,
    };

    it("returns session data for a valid token", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { userId: "user_1", sessionId: "sess_1" },
        protectedHeader: { alg: "HS256" },
      } as any);
      mockSessionFindOne.mockResolvedValueOnce({ token: "sess_1" });
      mockUserFindById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(mockUser),
      });

      const session = await verifySession("valid-jwt");

      expect(session).toEqual({
        userId: "user_1",
        email: "test@example.com",
        username: "testuser",
        firstName: "John",
        lastName: "Doe",
        avatarUrl: undefined,
        emailVerified: true,
        sessionId: "sess_1",
      });
    });

    it("returns null when JWT verification fails", async () => {
      mockJwtVerify.mockRejectedValueOnce(new Error("Invalid JWT"));

      const session = await verifySession("bad-jwt");
      expect(session).toBeNull();
    });

    it("returns null when session not found in DB", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { userId: "user_1", sessionId: "sess_1" },
        protectedHeader: { alg: "HS256" },
      } as any);
      mockSessionFindOne.mockResolvedValueOnce(null);

      const session = await verifySession("expired-token");
      expect(session).toBeNull();
    });

    it("returns null when user not found", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: { userId: "user_gone", sessionId: "sess_1" },
        protectedHeader: { alg: "HS256" },
      } as any);
      mockSessionFindOne.mockResolvedValueOnce({ token: "sess_1" });
      mockUserFindById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(null),
      });

      const session = await verifySession("orphan-token");
      expect(session).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getSession
  // ---------------------------------------------------------------------------
  describe("getSession", () => {
    it("returns null when no session cookie", async () => {
      mockGet.mockReturnValueOnce(undefined);

      const session = await getSession();
      expect(session).toBeNull();
    });

    it("delegates to verifySession when cookie exists", async () => {
      mockGet.mockReturnValueOnce({ value: "jwt-from-cookie" });
      // verifySession will fail because jwtVerify isn't set up
      mockJwtVerify.mockRejectedValueOnce(new Error("not set up"));

      const session = await getSession();
      expect(session).toBeNull();
      // Verify jwtVerify was called (meaning verifySession was invoked)
      expect(mockJwtVerify).toHaveBeenCalledWith(
        "jwt-from-cookie",
        expect.anything()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // setSessionCookie
  // ---------------------------------------------------------------------------
  describe("setSessionCookie", () => {
    it("sets cookie with standard duration", async () => {
      await setSessionCookie("my-jwt");

      expect(mockSet).toHaveBeenCalledWith("session", "my-jwt", {
        httpOnly: true,
        secure: false, // NODE_ENV is "test"
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: "/",
      });
    });

    it("sets cookie with extended duration when rememberMe", async () => {
      await setSessionCookie("my-jwt", true);

      expect(mockSet).toHaveBeenCalledWith("session", "my-jwt", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        path: "/",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteSession
  // ---------------------------------------------------------------------------
  describe("deleteSession", () => {
    it("deletes session from DB and removes cookie", async () => {
      mockGet.mockReturnValueOnce({ value: "jwt-to-delete" });
      mockJwtVerify.mockResolvedValueOnce({
        payload: { userId: "user_1", sessionId: "sess_1" },
        protectedHeader: { alg: "HS256" },
      } as any);
      mockSessionDeleteOne.mockResolvedValueOnce({});

      await deleteSession();

      expect(mockSessionDeleteOne).toHaveBeenCalledWith({
        userId: "user_1",
        token: "sess_1",
      });
      expect(mockDelete).toHaveBeenCalledWith("session");
    });

    it("deletes cookie even if no token present", async () => {
      mockGet.mockReturnValueOnce(undefined);

      await deleteSession();

      expect(mockSessionDeleteOne).not.toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalledWith("session");
    });

    it("deletes cookie even if JWT is invalid", async () => {
      mockGet.mockReturnValueOnce({ value: "bad-jwt" });
      mockJwtVerify.mockRejectedValueOnce(new Error("bad"));

      await deleteSession();

      expect(mockDelete).toHaveBeenCalledWith("session");
    });
  });

  // ---------------------------------------------------------------------------
  // deleteAllUserSessions
  // ---------------------------------------------------------------------------
  describe("deleteAllUserSessions", () => {
    it("deletes all sessions for user", async () => {
      mockSessionDeleteMany.mockResolvedValueOnce({ deletedCount: 3 });

      await deleteAllUserSessions("user_1");

      expect(mockSessionDeleteMany).toHaveBeenCalledWith({ userId: "user_1" });
    });
  });

  // ---------------------------------------------------------------------------
  // cleanupExpiredSessions
  // ---------------------------------------------------------------------------
  describe("cleanupExpiredSessions", () => {
    it("deletes sessions with past expiresAt", async () => {
      mockSessionDeleteMany.mockResolvedValueOnce({ deletedCount: 5 });

      await cleanupExpiredSessions();

      expect(mockSessionDeleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
    });
  });
});
