/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  buildJsonRequest,
  parseResponse,
  mockSession,
} from "../helpers/api-test-helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/app/lib/utils/session", () => ({
  getSession: jest.fn(),
  createSession: jest.fn().mockResolvedValue("mock-token"),
  setSessionCookie: jest.fn().mockResolvedValue(undefined),
  deleteSession: jest.fn().mockResolvedValue(undefined),
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
  RATE_LIMITS: { signup: {}, login: {} },
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}));

jest.mock("@/app/lib/services/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("nanoid", () => ({
  nanoid: jest.fn().mockReturnValue("mock-verification-token-123"),
}));

jest.mock("@/app/lib/db/models/User", () => {
  const m: Record<string, jest.Mock> = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  return { __esModule: true, default: m };
});

import { getSession } from "@/app/lib/utils/session";
import User from "@/app/lib/db/models/User";
import { POST as signupPOST } from "@/app/api/auth/signup/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as sessionGET } from "@/app/api/auth/session/route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const MockUser = User as unknown as Record<string, jest.Mock>;

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Auth API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/auth/signup ────────────────────────────────────────

  describe("POST /api/auth/signup", () => {
    it("should create a new user", async () => {
      MockUser.findOne.mockResolvedValue(null); // no existing user
      MockUser.create.mockResolvedValue({
        _id: { toString: () => "user-new" },
        email: "new@test.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
        emailVerified: false,
      });

      const req = buildJsonRequest("POST", "/api/auth/signup", {
        email: "new@test.com",
        username: "newuser",
        password: "Password1",
        confirmPassword: "Password1",
        firstName: "New",
        lastName: "User",
      });

      const { status, body } = await parseResponse(await signupPOST(req));

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("new@test.com");
    });

    it("should reject signup with existing email", async () => {
      MockUser.findOne.mockResolvedValue({ email: "existing@test.com" });

      const req = buildJsonRequest("POST", "/api/auth/signup", {
        email: "existing@test.com",
        username: "newuser",
        password: "Password1",
        confirmPassword: "Password1",
        firstName: "New",
        lastName: "User",
      });

      const { status, body } = await parseResponse(await signupPOST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("already exists");
    });

    it("should reject signup with existing username", async () => {
      MockUser.findOne
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ username: "takenuser" }); // username check

      const req = buildJsonRequest("POST", "/api/auth/signup", {
        email: "new2@test.com",
        username: "takenuser",
        password: "Password1",
        confirmPassword: "Password1",
        firstName: "New",
        lastName: "User",
      });

      const { status, body } = await parseResponse(await signupPOST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Username");
    });

    it("should reject signup with weak password", async () => {
      const req = buildJsonRequest("POST", "/api/auth/signup", {
        email: "new@test.com",
        username: "newuser",
        password: "weak",
        confirmPassword: "weak",
        firstName: "New",
        lastName: "User",
      });

      const { status, body } = await parseResponse(await signupPOST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject signup with mismatched passwords", async () => {
      const req = buildJsonRequest("POST", "/api/auth/signup", {
        email: "new@test.com",
        username: "newuser",
        password: "Password1",
        confirmPassword: "Password2",
        firstName: "New",
        lastName: "User",
      });

      const { status, body } = await parseResponse(await signupPOST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject signup with missing fields", async () => {
      const req = buildJsonRequest("POST", "/api/auth/signup", {
        email: "new@test.com",
      });

      const { status, body } = await parseResponse(await signupPOST(req));

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // ─── POST /api/auth/login ────────────────────────────────────────

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      MockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: { toString: () => "user-1" },
          email: "test@test.com",
          username: "testuser",
          firstName: "Test",
          lastName: "User",
          comparePassword: jest.fn().mockResolvedValue(true),
        }),
      });

      const req = buildJsonRequest("POST", "/api/auth/login", {
        email: "test@test.com",
        password: "Password1",
        rememberMe: false,
      });

      const { status, body } = await parseResponse(await loginPOST(req));

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("test@test.com");
    });

    it("should reject login with wrong password", async () => {
      MockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: { toString: () => "user-1" },
          email: "test@test.com",
          comparePassword: jest.fn().mockResolvedValue(false),
        }),
      });

      const req = buildJsonRequest("POST", "/api/auth/login", {
        email: "test@test.com",
        password: "WrongPass1",
        rememberMe: false,
      });

      const { status, body } = await parseResponse(await loginPOST(req));

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("should reject login with non-existent email", async () => {
      MockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = buildJsonRequest("POST", "/api/auth/login", {
        email: "nobody@test.com",
        password: "Password1",
        rememberMe: false,
      });

      const { status, body } = await parseResponse(await loginPOST(req));

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("should reject login with missing email", async () => {
      const req = buildJsonRequest("POST", "/api/auth/login", {
        password: "Password1",
        rememberMe: false,
      });

      const { status } = await parseResponse(await loginPOST(req));

      expect(status).toBe(400);
    });
  });

  // ─── POST /api/auth/logout ───────────────────────────────────────

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const { status, body } = await parseResponse(await logoutPOST());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  // ─── GET /api/auth/session ───────────────────────────────────────

  describe("GET /api/auth/session", () => {
    it("should return session when authenticated", async () => {
      mockedGetSession.mockResolvedValue({
        ...mockSession,
        username: "testuser",
        lastName: "User",
        avatarUrl: undefined,
      } as never);

      const { status, body } = await parseResponse(await sessionGET());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("test@example.com");
    });

    it("should return 401 when not authenticated", async () => {
      mockedGetSession.mockResolvedValue(null);

      const { status, body } = await parseResponse(await sessionGET());

      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });
  });
});
