import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Clear localStorage so each test starts from a clean state
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("app loads and shows the timer", async ({ page }) => {
  // Page title should contain "EisenMate"
  await expect(page).toHaveTitle(/EisenMate/i);

  // The start button should be visible (pomodoro timer is in idle state)
  const startButton = page.getByRole("button", { name: /start/i });
  await expect(startButton).toBeVisible();

  // The timer display should show the default time (e.g. "25:00")
  await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();
});

test("start and cancel a pomodoro", async ({ page }) => {
  const startButton = page.getByRole("button", { name: /^start$/i });
  await expect(startButton).toBeVisible();

  // Start the pomodoro
  await startButton.click();

  // Cancel button should appear (available in the first minute)
  const cancelButton = page.getByRole("button", { name: /^cancel$/i });
  await expect(cancelButton).toBeVisible();

  // Start button should no longer be visible while running
  await expect(startButton).not.toBeVisible();

  // The timer is running — we already verified this via the Cancel button being visible.
  // The session timer bar also appears, showing its own time display alongside the main timer.

  // Cancel the pomodoro
  await cancelButton.click();

  // Timer should return to idle: Start button is back, Cancel is gone
  await expect(startButton).toBeVisible();
  await expect(cancelButton).not.toBeVisible();
});

test("session timer starts automatically and can be ended with summary", async ({ page }) => {
  // --- Phase 1: Start a pomodoro → session timer bar appears ---
  const startButton = page.getByRole("button", { name: /^start$/i });
  await startButton.click();

  // The session timer bar should appear automatically
  // It contains an elapsed time display and an "End session" button
  const endSessionButton = page.getByRole("button", { name: /end session/i });
  await expect(endSessionButton).toBeVisible();

  // The session timer bar shows "0 Pomodoro" (none completed yet)
  await expect(page.getByText(/0\s+pomodoro/i)).toBeVisible();

  // Cancel the pomodoro (so we can verify session timer persists after cancel)
  const cancelButton = page.getByRole("button", { name: /^cancel$/i });
  await cancelButton.click();

  // After cancelling, the pomodoro is idle but the session timer bar should still be visible
  await expect(page.getByRole("button", { name: /^start$/i })).toBeVisible();
  await expect(endSessionButton).toBeVisible();

  // --- Phase 2: Verify the "End session" button opens the summary dialog ---
  await endSessionButton.click();

  // The SessionSummaryDialog should open
  await expect(page.getByText(/end session\?/i)).toBeVisible();
  await expect(page.getByText(/here is your summary/i)).toBeVisible();

  // Verify summary values are present
  await expect(page.getByText(/total duration/i)).toBeVisible();
  await expect(page.getByText(/focus time/i)).toBeVisible();
  await expect(page.getByText(/productivity/i)).toBeVisible();

  // The dialog should have a confirm button ("End session") and a cancel button ("Keep working")
  const confirmEndButton = page.getByRole("button", { name: /^end session$/i });
  const keepWorkingButton = page.getByRole("button", { name: /keep working/i });
  await expect(confirmEndButton).toBeVisible();
  await expect(keepWorkingButton).toBeVisible();

  // --- Phase 3: Dismiss the dialog first to verify "Keep working" works ---
  await keepWorkingButton.click();

  // Dialog should close, session timer bar should still be visible
  await expect(page.getByText(/end session\?/i)).not.toBeVisible();
  await expect(endSessionButton).toBeVisible();

  // --- Phase 4: Now actually end the session ---
  await endSessionButton.click();

  // Dialog opens again
  await expect(page.getByText(/end session\?/i)).toBeVisible();

  // Confirm ending the session
  await confirmEndButton.click();

  // Session timer bar should disappear after confirming
  await expect(endSessionButton).not.toBeVisible();

  // Timer should be back in idle state
  await expect(page.getByRole("button", { name: /^start$/i })).toBeVisible();
});

test("eisenhower matrix — create, edit, complete and delete tasks", async ({ page }) => {
  // --- Phase 1: Navigate to the Eisenhower page ---
  const tasksNavButton = page.getByRole("button", { name: /tasks/i });
  await tasksNavButton.click();

  // Verify page content: title and all four quadrant headings are visible
  await expect(page.getByText("Eisenhower Matrix")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Urgent & Important", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Important & Not Urgent", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Not Important & Urgent", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Not Important & Not Urgent", exact: true })).toBeVisible();

  // --- Phase 2: Create a task with quadrant "Urgent & Important" ---
  const taskNameInput = page.getByPlaceholder("New task...");
  const estimationInput = page.getByPlaceholder("Min");
  // The quadrant select is a native <select> — find the one in the creation form
  const quadrantSelect = page.locator("form select");
  const submitButton = page.locator("form button[type='submit']");

  await taskNameInput.fill("Write report");
  await estimationInput.fill("30");
  await quadrantSelect.selectOption("urgent-important");
  await submitButton.click();

  // Task should appear in the "Urgent & Important" quadrant
  await expect(page.getByText("Write report")).toBeVisible();
  // Verify the time display shows 0/30 min
  await expect(page.getByText("0/30 min")).toBeVisible();

  // --- Phase 3: Go back to Pomodoro page, verify quadrant chip ---
  const pomodoroNavButton = page.getByRole("button", { name: /pomodoro/i });
  await pomodoroNavButton.click();

  // Open the task selector (bottom sheet)
  const taskSelector = page.getByText("Select a task...");
  await taskSelector.click();

  // Wait for the sheet to open and show "My Tasks"
  await expect(page.getByText("My Tasks")).toBeVisible();

  // The task "Write report" should be in the list
  await expect(page.getByText("Write report")).toBeVisible();

  // The quadrant chip should show "urgent & important" (lowercase, from todos.urgentImportant)
  await expect(page.getByText("urgent & important")).toBeVisible();

  // Close the sheet by pressing Escape
  await page.keyboard.press("Escape");

  // --- Phase 4: Back to Eisenhower page ---
  await tasksNavButton.click();
  await expect(page.getByText("Eisenhower Matrix")).toBeVisible();

  // --- Phase 5: Create a second task without quadrant (unsorted) ---
  await taskNameInput.fill("Buy groceries");
  // Leave estimation at default (25) and quadrant at "Unsorted" (default)
  await submitButton.click();

  // The "Unsorted" section should appear with the new task
  await expect(page.getByText("Buy groceries")).toBeVisible();
  await expect(page.getByRole("button", { name: /unsorted \(1\)/i })).toBeVisible();

  // --- Phase 6: Edit the unsorted task ---
  // Hover over the task to reveal edit/delete buttons, then click the pencil icon
  const buyGroceriesItem = page.getByText("Buy groceries").locator("../..");
  await buyGroceriesItem.hover();

  // Click the pencil (edit) button — it's the first icon button in the action group
  const editButton = buyGroceriesItem.locator("button").filter({ has: page.locator("svg.lucide-pencil") });
  await editButton.click();

  // The edit dialog should open
  await expect(page.getByText("Edit task")).toBeVisible();
  await expect(page.getByText("Edit the name, time estimate, and quadrant.")).toBeVisible();

  // Change the task name
  const editContentInput = page.locator("#edit-content");
  await editContentInput.clear();
  await editContentInput.fill("Buy organic groceries");

  // Change the quadrant to "Important & Not Urgent"
  const editQuadrantSelect = page.locator("#edit-quadrant");
  await editQuadrantSelect.selectOption("not-urgent-important");

  // Save changes
  await page.getByRole("button", { name: /^save$/i }).click();

  // Dialog should close
  await expect(page.getByText("Edit task")).not.toBeVisible();

  // Task should now appear with the new name in the "Important & Not Urgent" quadrant
  await expect(page.getByText("Buy organic groceries")).toBeVisible();

  // --- Phase 7: Mark task as done ---
  const organicGroceriesItem = page.getByText("Buy organic groceries").locator("../..");
  // Click the check button (toggle done) — it's a button containing the Check icon
  const doneButton = organicGroceriesItem.locator("button").first();
  await doneButton.click();

  // The task text should now have line-through styling
  const taskText = page.getByText("Buy organic groceries");
  await expect(taskText).toHaveCSS("text-decoration-line", "line-through");

  // --- Phase 8: Delete the task ---
  await organicGroceriesItem.hover();
  const deleteButton = organicGroceriesItem.locator("button").filter({ has: page.locator("svg.lucide-trash-2") });
  await deleteButton.click();

  // Task should be gone
  await expect(page.getByText("Buy organic groceries")).not.toBeVisible();

  // "Write report" should still be there in Q1
  await expect(page.getByText("Write report")).toBeVisible();
});
