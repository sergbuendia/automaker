import { test, expect } from "@playwright/test";

test.describe("Agent Loop (Plan-Act-Verify)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and create a project
    await page.goto("/");

    // Create a project first
    await page.getByTestId("new-project-card").click();
    await page.getByTestId("project-name-input").fill("Test Project");
    await page.getByTestId("project-path-input").fill("/test/path");
    await page.getByTestId("confirm-create-project").click();

    // Wait for board view to load
    await expect(page.getByTestId("board-view")).toBeVisible();
  });

  test("Step 1: Trigger agent on a simple task - auto mode starts", async ({ page }) => {
    // Find and click the Auto Mode button
    const autoModeButton = page.getByTestId("start-auto-mode");
    await expect(autoModeButton).toBeVisible();

    // Click to start auto mode
    await autoModeButton.click();

    // Verify auto mode has started - stop button should now be visible
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });
  });

  test("Step 2: detailed logs show Planning phase", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for the activity log to appear
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });

    // The activity log panel should appear automatically when auto mode starts
    // Wait for planning phase to appear in the activity log
    await expect(page.getByTestId("planning-phase-icon")).toBeVisible({ timeout: 5000 });

    // Verify the planning message is displayed
    await expect(page.getByText("Planning implementation for:")).toBeVisible({ timeout: 5000 });
  });

  test("Step 3: detailed logs show Action phase", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for auto mode to be running
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });

    // Wait for action phase to appear in the activity log
    await expect(page.getByTestId("action-phase-icon")).toBeVisible({ timeout: 5000 });

    // Verify the action message is displayed
    await expect(page.getByText("Executing implementation for:")).toBeVisible({ timeout: 5000 });
  });

  test("Step 4: detailed logs show Verification phase", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for auto mode to be running
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });

    // Wait for verification phase to appear in the activity log
    await expect(page.getByTestId("verification-phase-icon")).toBeVisible({ timeout: 5000 });

    // Verify the verification message is displayed
    await expect(page.getByText("Verifying implementation for:")).toBeVisible({ timeout: 5000 });
  });

  test("Full agent loop: shows all three phases in sequence", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for auto mode to be running
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });

    // Wait for all phases to appear in sequence
    // Phase 1: Planning
    await expect(page.getByTestId("planning-phase-icon")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Planning implementation for:")).toBeVisible();

    // Phase 2: Action
    await expect(page.getByTestId("action-phase-icon")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Executing implementation for:")).toBeVisible();

    // Phase 3: Verification
    await expect(page.getByTestId("verification-phase-icon")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Verifying implementation for:")).toBeVisible();

    // Verify verification success message appears
    await expect(page.getByText("Verification successful")).toBeVisible({ timeout: 5000 });
  });

  test("Agent loop can be stopped mid-execution", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for auto mode to be running
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });

    // Stop auto mode
    await page.getByTestId("stop-auto-mode").click();

    // Verify auto mode has stopped - start button should be visible again
    await expect(page.getByTestId("start-auto-mode")).toBeVisible({ timeout: 5000 });
  });

  test("Activity log toggle button works", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for auto mode to be running and activity button to appear
    await expect(page.getByTestId("toggle-activity-log")).toBeVisible({ timeout: 5000 });

    // The activity log should be visible initially when auto mode starts
    // Toggle it off
    await page.getByTestId("toggle-activity-log").click();

    // Toggle it back on
    await page.getByTestId("toggle-activity-log").click();

    // The log panel should be visible
    await expect(page.getByText("Auto Mode Activity")).toBeVisible();
  });

  test("Tool usage is logged during action phase", async ({ page }) => {
    // Start auto mode
    await page.getByTestId("start-auto-mode").click();

    // Wait for auto mode to be running
    await expect(page.getByTestId("stop-auto-mode")).toBeVisible({ timeout: 5000 });

    // Wait for tool usage to appear in the activity log
    await expect(page.getByText("Using tool: Read")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Using tool: Write")).toBeVisible({ timeout: 5000 });
  });
});
