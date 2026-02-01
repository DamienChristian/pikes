import { test, expect } from "@playwright/test";

test.describe("Calendar App", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");

    // Check if the page loads
    await expect(page).toHaveTitle(/pikes/i);
  });

  test("navigates to calendar view", async ({ page }) => {
    await page.goto("/");

    // Add your E2E test logic here
    // For example: clicking on calendar, creating events, etc.
  });
});
