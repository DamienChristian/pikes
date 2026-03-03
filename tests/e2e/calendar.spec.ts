import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER, gotoCalendar } from "../helpers/e2e-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openCreateEventDialog(page: import("@playwright/test").Page) {
  await page.click('[aria-label="Create new event"]');
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Create New Event")
  ).toBeVisible();
}

async function fillEventTitle(
  page: import("@playwright/test").Page,
  title: string
) {
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="title"]').fill(title);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Calendar page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
    await gotoCalendar(page);
  });

  // ---- View Switching -------------------------------------------------------

  test.describe("View switching", () => {
    test("defaults to month view", async ({ page }) => {
      const monthBtn = page.getByRole("button", { name: "Month" });
      await expect(monthBtn).toBeVisible();
      await expect(page.locator('[role="gridcell"]').first()).toBeVisible();
    });

    test("switches to week view", async ({ page }) => {
      await page.getByRole("button", { name: "Week" }).click();
      // Week view replaces the month grid — gridcells are gone
      await expect(page.locator('[role="gridcell"]')).toHaveCount(0);
    });

    test("switches to day view", async ({ page }) => {
      await page.getByRole("button", { name: "Day" }).click();
      await expect(page.locator('[role="gridcell"]')).toHaveCount(0);
    });

    test("can cycle through all views and return to month", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Week" }).click();
      await page.getByRole("button", { name: "Day" }).click();
      await page.getByRole("button", { name: "Month" }).click();
      await expect(page.locator('[role="gridcell"]').first()).toBeVisible();
    });
  });

  // ---- Month Navigation -----------------------------------------------------

  test.describe("Month navigation", () => {
    test("navigates to previous month", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 2 });
      const initialText = await heading.textContent();
      await page.click('[aria-label="Previous month"]');
      const newText = await heading.textContent();
      expect(newText).not.toBe(initialText);
    });

    test("navigates to next month", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 2 });
      const initialText = await heading.textContent();
      await page.click('[aria-label="Next month"]');
      const newText = await heading.textContent();
      expect(newText).not.toBe(initialText);
    });

    test("Today button returns to current month", async ({ page }) => {
      await page.click('[aria-label="Next month"]');
      await page.click('[aria-label="Next month"]');
      await page.click('[aria-label="Go to today"]');
      const heading = page.getByRole("heading", { level: 2 });
      const now = new Date();
      const monthYear = now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      await expect(heading).toHaveText(monthYear);
    });
  });

  // ---- Event Creation -------------------------------------------------------

  test.describe("Event creation", () => {
    test("opens create event dialog via New Event button", async ({ page }) => {
      await openCreateEventDialog(page);
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator('input[name="title"]')).toBeVisible();
    });

    test("creates a new event with a title", async ({ page }) => {
      const eventTitle = `E2E Test Event ${Date.now()}`;
      await openCreateEventDialog(page);
      await fillEventTitle(page, eventTitle);
      await page.getByRole("button", { name: "Create Event" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({
        timeout: 8_000,
      });
    });

    test("shows validation error when title is empty", async ({ page }) => {
      await openCreateEventDialog(page);
      await page.getByRole("dialog").locator('input[name="title"]').clear();
      await page.getByRole("button", { name: "Create Event" }).click();
      await expect(
        page.getByRole("dialog").getByText(/required|title/i)
      ).toBeVisible();
    });

    test("cancel button closes dialog without saving", async ({ page }) => {
      await openCreateEventDialog(page);
      await fillEventTitle(page, "Should not be created");
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({
        timeout: 5_000,
      });
    });

    test("creates an all-day event", async ({ page }) => {
      const eventTitle = `E2E All-Day ${Date.now()}`;
      await openCreateEventDialog(page);
      await fillEventTitle(page, eventTitle);
      const allDayCheckbox = page.getByRole("dialog").getByLabel(/all.?day/i);
      if ((await allDayCheckbox.count()) > 0) {
        await allDayCheckbox.check();
      }
      await page.getByRole("button", { name: "Create Event" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({
        timeout: 8_000,
      });
    });
  });

  // ---- My Calendars Sidebar ------------------------------------------------

  test.describe("My Calendars sidebar", () => {
    test("shows My Calendars section", async ({ page }) => {
      await expect(
        page.getByText("My Calendars", { exact: true })
      ).toBeVisible();
    });

    test("can open new calendar dialog from sidebar plus button", async ({
      page,
    }) => {
      await page
        .locator(".bg-card.border.rounded-lg")
        .filter({ hasText: "My Calendars" })
        .getByRole("button")
        .click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    });
  });

  // ---- Quick Stats ---------------------------------------------------------

  test.describe("Quick Stats sidebar", () => {
    test("displays event and task counts", async ({ page }) => {
      await expect(page.getByText("Total Events:")).toBeVisible();
      await expect(page.getByText("Total Tasks:")).toBeVisible();
      await expect(page.getByText("Completed:")).toBeVisible();
    });
  });

  // ---- Import / Export Button ----------------------------------------------

  test.describe("Import / Export", () => {
    test("opens Import/Export dialog", async ({ page }) => {
      await page.getByRole("button", { name: /import.*export/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
    });
  });
});
