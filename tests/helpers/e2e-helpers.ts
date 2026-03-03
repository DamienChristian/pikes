/**
 * Shared E2E test helpers for Playwright tests.
 *
 * Usage:
 *   import { loginAs, TEST_USER } from "../helpers/e2e-helpers";
 *
 * Note: These helpers assume the dev server is running with a test user
 * seeded in the database. See tests/helpers/seed-test-db.ts for seeding.
 */

import { Page, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Test credentials - must exist in the running database
// ---------------------------------------------------------------------------
export const TEST_USER = {
  email: "test@example.com",
  password: "password123",
  firstName: "Test",
  lastName: "User",
  username: "testuser",
} as const;

export const TEST_USER_2 = {
  email: "test2@example.com",
  password: "password123",
  firstName: "Second",
  lastName: "User",
  username: "testuser2",
} as const;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Log in via the /auth/login page and wait until redirected away.
 * After this call the page is at "/" (the home route).
 */
export async function loginAs(
  page: Page,
  credentials: { email: string; password: string } = TEST_USER
): Promise<void> {
  await page.goto("/auth/login");
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  // LoginForm redirects to "/" on success
  await page.waitForURL("/", { timeout: 15_000 });
}

/**
 * Log out via the header dropdown and wait until redirected to /auth/login.
 */
export async function logout(page: Page): Promise<void> {
  // Open user dropdown in the header
  await page
    .locator("header")
    .getByRole("button", { name: /user|account|profile/i })
    .first()
    .click();
  await page.getByRole("menuitem", { name: /log ?out|sign ?out/i }).click();
  await page.waitForURL("/auth/login", { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

export async function gotoCalendar(page: Page): Promise<void> {
  await page.goto("/calendar");
  await page.waitForLoadState("networkidle");
}

export async function gotoNotes(page: Page): Promise<void> {
  await page.goto("/notes");
  await page.waitForLoadState("networkidle");
}

export async function gotoTasks(page: Page): Promise<void> {
  await page.goto("/tasks");
  await page.waitForLoadState("networkidle");
}

export async function gotoProfile(page: Page): Promise<void> {
  await page.goto("/profile");
  await page.waitForLoadState("networkidle");
}

// ---------------------------------------------------------------------------
// Dialog helpers
// ---------------------------------------------------------------------------

/** Wait for a dialog with the given title to appear. */
export async function waitForDialog(page: Page, titlePattern: string | RegExp) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 8_000 });
  if (titlePattern) {
    await expect(
      dialog.getByRole("heading").filter({ hasText: titlePattern })
    ).toBeVisible();
  }
  return dialog;
}

/** Close dialog by pressing Escape. */
export async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

/** Assert a toast notification with a given text fragment is shown. */
export async function expectToast(
  page: Page,
  textFragment: string | RegExp,
  type: "success" | "error" | "any" = "any"
): Promise<void> {
  // Sonner toasts are rendered in [data-sonner-toaster] container
  const toastLocator = page.locator("[data-sonner-toast]");
  await expect(toastLocator.filter({ hasText: textFragment })).toBeVisible({
    timeout: 8_000,
  });
  void type; // currently unused — extend to check data-type attr if needed
}
