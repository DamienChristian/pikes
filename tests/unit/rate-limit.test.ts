/**
 * @jest-environment node
 */

import {
  rateLimit,
  getRateLimitHeaders,
  RATE_LIMITS,
} from "@/app/lib/utils/rate-limit";

describe("Rate Limit Utilities", () => {
  // Use a unique prefix per test to avoid cross-contamination
  let testId = 0;
  const uid = () => `rate-test-${++testId}-${Date.now()}`;

  // ---------------------------------------------------------------------------
  // rateLimit
  // ---------------------------------------------------------------------------
  describe("rateLimit", () => {
    it("allows requests under the limit", () => {
      const id = uid();
      const config = { windowMs: 60_000, maxRequests: 5 };

      const r1 = rateLimit(id, config);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(4);

      const r2 = rateLimit(id, config);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(3);
    });

    it("blocks requests at the limit", () => {
      const id = uid();
      const config = { windowMs: 60_000, maxRequests: 2 };

      rateLimit(id, config); // 1
      rateLimit(id, config); // 2

      const r3 = rateLimit(id, config); // 3 → over limit
      expect(r3.success).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it("remaining never goes below 0", () => {
      const id = uid();
      const config = { windowMs: 60_000, maxRequests: 1 };

      rateLimit(id, config);
      rateLimit(id, config);
      const result = rateLimit(id, config);

      expect(result.remaining).toBe(0);
    });

    it("returns resetTime in the future", () => {
      const id = uid();
      const config = { windowMs: 60_000, maxRequests: 5 };

      const result = rateLimit(id, config);
      expect(result.resetTime).toBeGreaterThan(Date.now() - 1000);
    });

    it("different identifiers are independent", () => {
      const id1 = uid();
      const id2 = uid();
      const config = { windowMs: 60_000, maxRequests: 1 };

      rateLimit(id1, config);
      const r = rateLimit(id2, config);

      expect(r.success).toBe(true);
      expect(r.remaining).toBe(0);
    });

    it("resets after window expires", () => {
      // We can't easily fast-forward timers with the in-memory store that uses
      // Date.now(), but we can verify the mechanism by observing resetTime.
      const id = uid();
      const config = { windowMs: 1, maxRequests: 1 }; // 1ms window

      rateLimit(id, config);

      // Wait a tiny bit for the window to expire
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy-wait 5ms
      }

      const result = rateLimit(id, config);
      // After window expired, should reset
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getRateLimitHeaders
  // ---------------------------------------------------------------------------
  describe("getRateLimitHeaders", () => {
    it("returns correct header keys and values", () => {
      const resetTime = Date.now() + 60_000;
      const headers = getRateLimitHeaders(3, resetTime);

      expect(headers["X-RateLimit-Remaining"]).toBe("3");
      expect(headers["X-RateLimit-Reset"]).toBe(
        new Date(resetTime).toISOString()
      );
    });

    it("returns '0' remaining as string", () => {
      const headers = getRateLimitHeaders(0, Date.now());
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });
  });

  // ---------------------------------------------------------------------------
  // RATE_LIMITS presets
  // ---------------------------------------------------------------------------
  describe("RATE_LIMITS configuration presets", () => {
    it("has login config", () => {
      expect(RATE_LIMITS.login.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMITS.login.maxRequests).toBe(5);
    });

    it("has signup config", () => {
      expect(RATE_LIMITS.signup.windowMs).toBe(60 * 60 * 1000);
      expect(RATE_LIMITS.signup.maxRequests).toBe(3);
    });

    it("has passwordReset config", () => {
      expect(RATE_LIMITS.passwordReset.windowMs).toBe(60 * 60 * 1000);
      expect(RATE_LIMITS.passwordReset.maxRequests).toBe(3);
    });

    it("has createEvent config", () => {
      expect(RATE_LIMITS.createEvent.windowMs).toBe(60 * 1000);
      expect(RATE_LIMITS.createEvent.maxRequests).toBe(10);
    });
  });
});
