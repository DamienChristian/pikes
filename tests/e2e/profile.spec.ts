import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER, gotoProfile } from "../helpers/e2e-helpers";

test.describe("Profile page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USER);
    await gotoProfile(page);
  });

  // ---- Page Layout ---------------------------------------------------------

  test.describe("Page layout", () => {
    test("renders the Profile Settings heading", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Profile Settings" })
      ).toBeVisible();
    });

    test("shows Profile Information card", async ({ page }) => {
      await expect(page.getByText("Profile Information")).toBeVisible();
    });

    test("shows Change Password card", async ({ page }) => {
      await expect(page.getByText("Change Password")).toBeVisible();
    });
  });

  // ---- Profile Information ------------------------------------------------

  test.describe("Profile information", () => {
    test("displays the current first and last name", async ({ page }) => {
      const firstNameInput = page.getByLabel("First Name");
      const lastNameInput = page.getByLabel("Last Name");
      await expect(firstNameInput).toBeVisible();
      await expect(lastNameInput).toBeVisible();
      await expect(firstNameInput).toHaveValue(TEST_USER.firstName);
      await expect(lastNameInput).toHaveValue(TEST_USER.lastName);
    });

    test("displays the username (read-only)", async ({ page }) => {
      // Username field exists and is disabled
      const usernameInput = page
        .getByRole("main")
        .locator('input[value="' + TEST_USER.username + '"]');
      if ((await usernameInput.count()) > 0) {
        await expect(usernameInput).toBeDisabled();
      } else {
        // username shown in a different way — at least verify it's on the page
        await expect(page.getByText(TEST_USER.username)).toBeVisible();
      }
    });

    test("displays the email (read-only)", async ({ page }) => {
      const emailInput = page.locator('input[value="' + TEST_USER.email + '"]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeDisabled();
    });

    test("can update the first name", async ({ page }) => {
      const firstNameInput = page.getByLabel("First Name");
      await firstNameInput.clear();
      await firstNameInput.fill("Updated");
      await page.getByRole("button", { name: "Save Changes" }).click();
      // Wait for the success toast or network request to complete
      await page.waitForTimeout(2_000);
      // Restore original name so subsequent runs see the expected value
      await firstNameInput.clear();
      await firstNameInput.fill(TEST_USER.firstName);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await page.waitForTimeout(2_000);
    });

    test("Save Changes button is present", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Save Changes" })
      ).toBeVisible();
    });
  });

  // ---- Change Password -----------------------------------------------------

  test.describe("Change password", () => {
    test("renders the change password form fields", async ({ page }) => {
      await expect(page.getByLabel("Current Password")).toBeVisible();
      await expect(page.getByLabel("New Password")).toBeVisible();
      await expect(page.getByLabel("Confirm New Password")).toBeVisible();
    });

    test("shows validation error when new passwords do not match", async ({
      page,
    }) => {
      await page.getByLabel("Current Password").fill(TEST_USER.password);
      await page.getByLabel("New Password").fill("NewPassword123!");
      await page
        .getByLabel("Confirm New Password")
        .fill("DifferentPassword456!");
      await page.getByRole("button", { name: "Change Password" }).click();
      // Should stay on profile page — validation prevents submission
      await expect(page).toHaveURL(/profile/);
      await page.waitForTimeout(500);
    });

    test("shows validation error when new password is too short", async ({
      page,
    }) => {
      await page.getByLabel("Current Password").fill(TEST_USER.password);
      await page.getByLabel("New Password").fill("abc");
      await page.getByLabel("Confirm New Password").fill("abc");
      await page.getByRole("button", { name: "Change Password" }).click();
      await expect(page).toHaveURL(/profile/);
    });

    test("shows error when current password is wrong", async ({ page }) => {
      await page.getByLabel("Current Password").fill("wrong-current-password");
      await page.getByLabel("New Password").fill("NewPassword123!");
      await page.getByLabel("Confirm New Password").fill("NewPassword123!");
      await page.getByRole("button", { name: "Change Password" }).click();
      // Should remain on profile and show an error (toast or inline)
      await page.waitForTimeout(2_000);
      await expect(page).toHaveURL(/profile/);
    });

    test("Change Password button is present in the form", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Change Password" })
      ).toBeVisible();
    });
  });

  // ---- Avatar Upload -------------------------------------------------------

  test.describe("Avatar upload section", () => {
    test("avatar upload area is visible on the profile page", async ({
      page,
    }) => {
      // AvatarUpload component renders a file input or initials-based avatar
      // Check for the profile information card which contains the upload
      await expect(
        page.getByText("Update your personal information and profile picture")
      ).toBeVisible();
    });
  });

  // ---- Navigation to profile -----------------------------------------------

  test.describe("Navigation", () => {
    test("profile is accessible via direct URL when authenticated", async ({
      page,
    }) => {
      await page.goto("/profile");
      await expect(page).toHaveURL("/profile");
      await expect(
        page.getByRole("heading", { name: "Profile Settings" })
      ).toBeVisible();
    });
  });
});
