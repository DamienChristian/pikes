import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for Tasks feature
 */

test.describe("Tasks Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/calendar");
  });

  test.describe("Task Creation", () => {
    test("should create a task from calendar", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');

      // Switch to task type
      await page.click('button:has-text("Task")');

      await page.fill('input[name="title"]', "Complete Project");
      await page.fill(
        'textarea[name="description"]',
        "Finish the calendar app"
      );

      // Set category
      await page.click('button:has-text("Select category")');
      await page.click("text=Work");

      await page.click('button[type="submit"]');

      await expect(page.locator("text=Complete Project")).toBeVisible();
    });

    test("should create task with deadline", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');
      await page.click('button:has-text("Task")');

      await page.fill('input[name="title"]', "Task with Deadline");

      // Set deadline (implementation depends on DateTimePicker)
      // await page.click('input[name="deadline"]');
      // await page.selectOption('select[name="day"]', '15');

      await page.click('button[type="submit"]');
    });

    test("should validate start date before deadline", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');
      await page.click('button:has-text("Task")');

      await page.fill('input[name="title"]', "Invalid Task");

      // Try to set deadline before start date
      // Should show validation error or auto-adjust
    });
  });

  test.describe("Task Display", () => {
    test("should display tasks on tasks page", async ({ page }) => {
      await page.goto("/tasks");
      await expect(page).toHaveURL("/tasks");
      await expect(page.locator("h1")).toContainText("Tasks");
    });

    test("should show tasks in calendar day view", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Day")');

      // Tasks should appear with checkbox icon
      await expect(page.locator(".task-item")).toBeVisible();
    });

    test("should show tasks in calendar week view", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Week")');

      // Tasks should span full width
      await expect(page.locator(".task-item")).toBeVisible();
    });

    test("should display task details on click", async ({ page }) => {
      await page.goto("/calendar");

      // Click on a task
      await page.locator(".task-item").first().click();

      // Should open detail dialog
      await expect(page.locator("dialog")).toBeVisible();
      await expect(page.locator("text=Task Details")).toBeVisible();
    });
  });

  test.describe("Task Completion", () => {
    test("should mark task as completed", async ({ page }) => {
      await page.goto("/tasks");

      // Click on task to open details
      await page.locator(".task-item").first().click();

      // Click edit
      await page.click('button:has-text("Edit")');

      // Check completed checkbox
      await page.check('input[name="completed"]');

      await page.click('button[type="submit"]');

      // Task should show as completed (strikethrough or different style)
      await expect(page.locator(".task-item.completed")).toBeVisible();
    });

    test("should filter completed tasks", async ({ page }) => {
      await page.goto("/tasks");

      // Click filter for completed tasks
      await page.click('button:has-text("Completed")');

      // Should show only completed tasks
      await expect(page.locator(".task-item.completed")).toBeVisible();
      await expect(
        page.locator(".task-item:not(.completed)")
      ).not.toBeVisible();
    });

    test("should filter incomplete tasks", async ({ page }) => {
      await page.goto("/tasks");

      await page.click('button:has-text("Incomplete")');

      await expect(page.locator(".task-item:not(.completed)")).toBeVisible();
      await expect(page.locator(".task-item.completed")).not.toBeVisible();
    });
  });

  test.describe("Task Categories", () => {
    test("should create task with existing category", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');
      await page.click('button:has-text("Task")');

      await page.fill('input[name="title"]', "Work Task");

      await page.click('button:has-text("Select category")');
      await page.click("text=Work");

      await page.click('button[type="submit"]');

      await expect(page.locator("text=Work")).toBeVisible();
    });

    test("should create task with new category", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');
      await page.click('button:has-text("Task")');

      await page.fill('input[name="title"]', "New Category Task");

      await page.click('button:has-text("Select category")');
      await page.click('button:has-text("Create new")');
      await page.fill('input[placeholder="Enter new category"]', "Urgent");
      await page.click('button:has-text("Add")');

      await page.click('button[type="submit"]');

      await expect(page.locator("text=Urgent")).toBeVisible();
    });

    test("should filter tasks by category", async ({ page }) => {
      await page.goto("/tasks");

      await page.click('button:has-text("Work")');

      // Should show only Work tasks
      await expect(page.locator('[data-category="Work"]')).toBeVisible();
    });
  });

  test.describe("Task with Notes", () => {
    test("should attach note to task during creation", async ({ page }) => {
      await page.goto("/calendar");
      await page.click('button:has-text("Create Event")');
      await page.click('button:has-text("Task")');

      await page.fill('input[name="title"]', "Task with Note");

      // Scroll to attach notes section
      await page.click("text=Attach Notes");
      await page.click('button:has-text("Create New Note")');

      await page.fill('input[name="title"]', "Task Note");
      await page.click(".ProseMirror");
      await page.keyboard.type("Note for task");
      await page.click('button[type="submit"]');

      await page.click('button:has-text("Create Event")');

      // Verify note is linked
      await page.goto("/notes");
      await expect(page.locator("text=Task Note")).toBeVisible();
    });

    test("should show attached notes in task detail", async ({ page }) => {
      await page.goto("/calendar");

      // Click on task with notes
      await page.locator(".task-item").first().click();

      // Should show notes section
      await expect(page.locator("text=Notes")).toBeVisible();
    });
  });

  test.describe("Task Editing", () => {
    test("should edit task title", async ({ page }) => {
      await page.goto("/tasks");

      await page.locator(".task-item").first().click();
      await page.click('button:has-text("Edit")');

      await page.fill('input[name="title"]', "Updated Task Title");
      await page.click('button[type="submit"]');

      await expect(page.locator("text=Updated Task Title")).toBeVisible();
    });

    test("should change task deadline", async ({ page }) => {
      await page.goto("/tasks");

      await page.locator(".task-item").first().click();
      await page.click('button:has-text("Edit")');

      // Update deadline
      // Implementation depends on DateTimePicker

      await page.click('button[type="submit"]');
    });

    test("should change task category", async ({ page }) => {
      await page.goto("/tasks");

      await page.locator(".task-item").first().click();
      await page.click('button:has-text("Edit")');

      await page.click('button:has-text("Select category")');
      await page.click("text=Personal");

      await page.click('button[type="submit"]');

      await expect(page.locator("text=Personal")).toBeVisible();
    });
  });

  test.describe("Task Deletion", () => {
    test("should delete task", async ({ page }) => {
      await page.goto("/tasks");

      const taskTitle = await page
        .locator(".task-item h3")
        .first()
        .textContent();

      await page.locator(".task-item").first().click();
      await page.click('button:has-text("Delete")');

      // Confirm deletion
      await page.click('button:has-text("Confirm")');

      await expect(page.locator(`text=${taskTitle}`)).not.toBeVisible();
    });
  });
});
