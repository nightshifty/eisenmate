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
