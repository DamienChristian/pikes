/**
 * Simple in-memory rate limiter
 * For production, use Redis or a proper rate limiting service
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
// .unref() prevents this timer from keeping the Node.js process (or Jest) alive
setInterval(
  () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    });
  },
  5 * 60 * 1000
).unref();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  success: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = identifier;

  // Initialize or reset if window expired
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Increment count
  store[key].count++;

  const remaining = Math.max(0, config.maxRequests - store[key].count);
  const success = store[key].count <= config.maxRequests;

  return {
    success,
    remaining,
    resetTime: store[key].resetTime,
  };
}

export function getRateLimitHeaders(
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(resetTime).toISOString(),
  };
}

// Rate limit configurations
export const RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  signup: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 signups per hour per IP
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 reset requests per hour
  },
  createEvent: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 events per minute per user
  },
} as const;
