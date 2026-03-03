/**
 * Shared helpers for API integration tests.
 *
 * Every integration test mocks:
 *   - `@/app/lib/utils/session`  → controls authentication
 *   - `@/app/lib/db/mongodb`     → prevents real DB connection
 *   - Individual Mongoose models  → returns controlled data
 *
 * Route handlers are imported directly and invoked with a synthetic
 * NextRequest (no HTTP server required).
 */

import { NextRequest } from "next/server";

// ── Helpers for building requests ──────────────────────────────────────────

const BASE_URL = "http://localhost:3000";

/**
 * Build a NextRequest for a GET endpoint.
 */
export function buildGetRequest(
  path: string,
  params?: Record<string, string>
): NextRequest {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
}

/**
 * Build a NextRequest for a POST / PATCH / PUT endpoint with JSON body.
 */
export function buildJsonRequest(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): NextRequest {
  return new NextRequest(new URL(path, BASE_URL), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Build a route-params promise that Next.js App Router passes to dynamic
 * route handlers, e.g. `{ params: Promise<{ id: string }> }`.
 */
export function buildParams<T extends Record<string, string>>(
  values: T
): { params: Promise<T> } {
  return { params: Promise.resolve(values) };
}

// ── Re-usable mock session value ───────────────────────────────────────────

export const MOCK_USER_ID = "6650000000000000000a0001";
export const MOCK_USER_ID_2 = "6650000000000000000a0002";

export const mockSession = {
  userId: MOCK_USER_ID,
  email: "test@example.com",
  firstName: "Test",
};

export const mockSession2 = {
  userId: MOCK_USER_ID_2,
  email: "other@example.com",
  firstName: "Other",
};

// ── Helpers for parsing JSON from NextResponse ─────────────────────────────

export async function parseResponse(res: Response) {
  const json = await res.json();
  return { status: res.status, body: json };
}
