import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for Notes feature
 */

test.describe("Notes Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/calendar");
  });

  test.describe("Notes Page", () => {
    test("should navigate to notes page", async ({ page }) => {
      await page.click('a[href="/notes"]');
      await expect(page).toHaveURL("/notes");
      await expect(page.locator("h1")).toContainText("Notes");
    });

    test("should display empty state when no notes", async ({ page }) => {
      await page.goto("/notes");
      // Assuming no notes exist
      await expect(page.locator("text=No notes yet")).toBeVisible();
    });

    test("should open create note dialog", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');
      await expect(page.locator("dialog")).toBeVisible();
      await expect(page.locator("text=Create New Note")).toBeVisible();
    });
  });

  test.describe("Note Creation", () => {
    test("should create a new note", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      // Fill in note details
      await page.fill('input[name="title"]', "My Test Note");

      // Use rich text editor
      await page.click(".ProseMirror");
      await page.keyboard.type("This is my note content");

      // Submit
      await page.click('button[type="submit"]');

      // Verify note appears in list
      await expect(page.locator("text=My Test Note")).toBeVisible();
    });

    test("should create note with category", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      await page.fill('input[name="title"]', "Work Note");
      await page.click(".ProseMirror");
      await page.keyboard.type("Work content");

      // Select category
      await page.click('button:has-text("Select category")');
      await page.click("text=Work");

      await page.click('button[type="submit"]');

      await expect(page.locator("text=Work Note")).toBeVisible();
      await expect(page.locator("text=Work").first()).toBeVisible();
    });

    test("should validate required fields", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      // Try to submit without title
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator("text=required")).toBeVisible();
    });
  });

  test.describe("Rich Text Editor", () => {
    test("should apply bold formatting", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      await page.fill('input[name="title"]', "Formatting Test");
      await page.click(".ProseMirror");
      await page.keyboard.type("Bold text");

      // Select all text
      await page.keyboard.press("Control+A");

      // Click bold button
      await page.click(
        'button[aria-label*="bold"], button:has(svg.lucide-bold)'
      );

      // Verify bold is applied
      await expect(page.locator(".ProseMirror strong")).toBeVisible();
    });

    test("should apply italic formatting", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      await page.fill('input[name="title"]', "Italic Test");
      await page.click(".ProseMirror");
      await page.keyboard.type("Italic text");

      await page.keyboard.press("Control+A");

      // Click italic button
      await page.click(
        'button[aria-label*="italic"], button:has(svg.lucide-italic)'
      );

      await expect(page.locator(".ProseMirror em")).toBeVisible();
    });

    test("should create bullet list", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      await page.fill('input[name="title"]', "List Test");
      await page.click(".ProseMirror");

      // Click bullet list button
      await page.click("button:has(svg.lucide-list)");

      await page.keyboard.type("Item 1");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Item 2");

      await expect(page.locator(".ProseMirror ul li")).toHaveCount(2);
    });

    test("should toggle formatting on and off", async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');

      await page.fill('input[name="title"]', "Toggle Test");
      await page.click(".ProseMirror");
      await page.keyboard.type("Text");

      await page.keyboard.press("Control+A");

      // Apply bold
      const boldButton = page.locator("button:has(svg.lucide-bold)");
      await boldButton.click();
      await expect(page.locator(".ProseMirror strong")).toBeVisible();

      // Remove bold
      await boldButton.click();
      await expect(page.locator(".ProseMirror strong")).not.toBeVisible();
    });
  });

  test.describe("Note Filtering", () => {
    test("should filter notes by category", async ({ page }) => {
      await page.goto("/notes");

      // Assuming notes with different categories exist
      await page.click('button:has-text("Work")');

      // Should show only Work notes
      await expect(page.locator('[data-category="Work"]')).toBeVisible();
    });

    test('should show all notes when "All" is selected', async ({ page }) => {
      await page.goto("/notes");
      await page.click('button:has-text("All")');

      // Should show all notes regardless of category
    });
  });

  test.describe("Note Editing", () => {
    test("should edit existing note", async ({ page }) => {
      await page.goto("/notes");

      // Click edit on first note
      await page.locator('button[aria-label="Edit note"]').first().click();

      // Update title
      await page.fill('input[name="title"]', "Updated Note Title");

      await page.click('button[type="submit"]');

      await expect(page.locator("text=Updated Note Title")).toBeVisible();
    });
  });

  test.describe("Note Deletion", () => {
    test("should delete note", async ({ page }) => {
      await page.goto("/notes");

      const noteTitle = await page
        .locator(".note-card h3")
        .first()
        .textContent();

      // Click delete
      await page.locator('button[aria-label="Delete note"]').first().click();

      // Confirm deletion
      await page.click('button:has-text("Delete")');

      // Note should be removed
      await expect(page.locator(`text=${noteTitle}`)).not.toBeVisible();
    });
  });

  test.describe("Notes with Events/Tasks", () => {
    test("should attach note to event during creation", async ({ page }) => {
      // Create event
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');

      await page.fill('input[name="title"]', "Event with Note");

      // Scroll to notes section
      await page.click("text=Attach Notes");

      // Create new note
      await page.click('button:has-text("Create New Note")');
      await page.fill('input[name="title"]', "Event Note");
      await page.click(".ProseMirror");
      await page.keyboard.type("Note for this event");
      await page.click('button[type="submit"]');

      // Save event
      await page.click('button:has-text("Create Event")');

      // Verify note is created and linked
      await page.goto("/notes");
      await expect(page.locator("text=Event Note")).toBeVisible();
    });

    test("should select existing note when creating event", async ({
      page,
    }) => {
      // First create a note
      await page.goto("/notes");
      await page.click('button:has-text("Create Note")');
      await page.fill('input[name="title"]', "Existing Note");
      await page.click(".ProseMirror");
      await page.keyboard.type("Content");
      await page.click('button[type="submit"]');

      // Create event and attach existing note
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');
      await page.fill('input[name="title"]', "Event");

      // Select existing note
      await page.click('button:has-text("Existing Note")');

      await page.click('button[type="submit"]');

      // Open event detail
      await page.click("text=Event");

      // Should show linked note
      await expect(page.locator("text=Existing Note")).toBeVisible();
    });

    test("should show notes in event detail dialog", async ({ page }) => {
      await page.goto("/calendar");

      // Click on an event with notes
      await page.locator(".event-card").first().click();

      // Should display notes section
      await expect(page.locator("text=Notes")).toBeVisible();
    });

    test("should attach note when editing event", async ({ page }) => {
      await page.goto("/calendar");

      // Open event
      await page.locator(".event-card").first().click();

      // Click edit
      await page.click('button:has-text("Edit")');

      // Scroll to notes section
      await page.click("text=Attach Notes");

      // Create new note
      await page.click('button:has-text("Create New Note")');
      await page.fill('input[name="title"]', "Added Later");
      await page.click(".ProseMirror");
      await page.keyboard.type("Note added during edit");
      await page.click('button[type="submit"]');

      // Save event
      await page.click('button:has-text("Update Event")');

      // Verify note is linked
      await page.goto("/notes");
      await expect(page.locator("text=Added Later")).toBeVisible();
    });
  });
});
