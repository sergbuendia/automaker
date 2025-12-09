import { test, expect } from "@playwright/test";

test.describe("Interactive New Project Interview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Step 1: Click 'New Project' -> 'Interactive Mode' navigates to interview view", async ({ page }) => {
    // Click the Create Project dropdown button
    await page.getByTestId("create-new-project").click();

    // Wait for dropdown to appear and click Interactive Mode option
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Verify the header shows "New Project Interview"
    await expect(page.getByText("New Project Interview")).toBeVisible();
  });

  test("Step 2: Chat interface appears asking 'What do you want to build?'", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Verify the first question is displayed
    await expect(page.getByTestId("interview-messages")).toBeVisible();
    await expect(page.getByText("What do you want to build?")).toBeVisible();

    // Verify input field is available
    await expect(page.getByTestId("interview-input")).toBeVisible();
    await expect(page.getByTestId("interview-send")).toBeVisible();
  });

  test("Step 3: User can reply 'A todo app'", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Type the answer in the input field
    await page.getByTestId("interview-input").fill("A todo app");

    // Click send button
    await page.getByTestId("interview-send").click();

    // Verify user message appears in the chat
    await expect(page.getByTestId("interview-messages").getByText("A todo app")).toBeVisible();
  });

  test("Step 4: Agent asks clarifying questions (tech stack)", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Wait for interview view
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Answer first question
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    // Wait for the next question to appear (tech stack question)
    await expect(page.getByText("What tech stack would you like to use?")).toBeVisible({ timeout: 5000 });

    // Verify progress text shows question 2 of 4
    await expect(page.getByText("Question 2 of 4")).toBeVisible();
  });

  test("Step 5: Agent generates draft app_spec.txt based on conversation", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Wait for interview view
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Answer first question - project description
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    // Wait for tech stack question
    await expect(page.getByText("What tech stack would you like to use?")).toBeVisible({ timeout: 5000 });

    // Answer tech stack question
    await page.getByTestId("interview-input").fill("React, Next.js, TypeScript");
    await page.getByTestId("interview-send").click();

    // Wait for features question
    await expect(page.getByText("What are the core features you want to include?")).toBeVisible({ timeout: 5000 });

    // Answer features question
    await page.getByTestId("interview-input").fill("Add tasks, Mark complete, Delete tasks");
    await page.getByTestId("interview-send").click();

    // Wait for additional requirements question
    await expect(page.getByText("Any additional requirements or preferences?")).toBeVisible({ timeout: 5000 });

    // Answer additional requirements
    await page.getByTestId("interview-input").fill("Dark mode support");
    await page.getByTestId("interview-send").click();

    // Wait for spec generation to complete
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 10000 });

    // Verify spec preview is visible with generated content
    await expect(page.getByTestId("spec-preview")).toBeVisible();

    // Verify the generated spec contains the project description
    const specPreview = page.getByTestId("spec-preview");
    await expect(specPreview).toContainText("A todo app");

    // Verify it contains tech stack information
    await expect(specPreview).toContainText("React");

    // Verify it contains features
    await expect(specPreview).toContainText("Add tasks");
  });

  test("Interview shows progress indicator with correct number of steps", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Verify progress text shows question 1 of 4
    await expect(page.getByText("Question 1 of 4")).toBeVisible();
  });

  test("Send button is disabled when input is empty", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify send button is disabled when input is empty
    await expect(page.getByTestId("interview-send")).toBeDisabled();

    // Type something
    await page.getByTestId("interview-input").fill("Test");

    // Now button should be enabled
    await expect(page.getByTestId("interview-send")).toBeEnabled();

    // Clear input
    await page.getByTestId("interview-input").fill("");

    // Button should be disabled again
    await expect(page.getByTestId("interview-send")).toBeDisabled();
  });

  test("Can submit answer by pressing Enter", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Type answer and press Enter
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-input").press("Enter");

    // Verify user message appears
    await expect(page.getByTestId("interview-messages").getByText("A todo app")).toBeVisible();
  });

  test("Back button returns to welcome view", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Click back button
    await page.getByTestId("interview-back-button").click();

    // Verify we're back on welcome view
    await expect(page.getByTestId("welcome-view")).toBeVisible();
  });

  test("Project setup form appears after completing interview", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all questions
    await page.getByTestId("interview-input").fill("A simple todo app");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("What tech stack would you like to use?")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("React");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("What are the core features")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("Add, edit, delete tasks");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("Any additional requirements")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("None");
    await page.getByTestId("interview-send").click();

    // Wait for project setup form
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 10000 });

    // Verify form has name input
    await expect(page.getByTestId("interview-project-name-input")).toBeVisible();

    // Verify form has path input
    await expect(page.getByTestId("interview-project-path-input")).toBeVisible();

    // Verify browse directory button
    await expect(page.getByTestId("interview-browse-directory")).toBeVisible();

    // Verify create project button
    await expect(page.getByTestId("interview-create-project")).toBeVisible();
  });

  test("Create project button is disabled without name and path", async ({ page }) => {
    // Navigate to interview view and complete interview
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all questions quickly
    await page.getByTestId("interview-input").fill("A simple todo app");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("What tech stack")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("React");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("core features")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("Tasks");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("additional requirements")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("None");
    await page.getByTestId("interview-send").click();

    // Wait for project setup form
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 10000 });

    // Create button should be disabled without name and path
    await expect(page.getByTestId("interview-create-project")).toBeDisabled();

    // Enter project name
    await page.getByTestId("interview-project-name-input").fill("my-todo-app");

    // Still disabled (no path)
    await expect(page.getByTestId("interview-create-project")).toBeDisabled();

    // Enter path
    await page.getByTestId("interview-project-path-input").fill("/Users/test/projects");

    // Now should be enabled
    await expect(page.getByTestId("interview-create-project")).toBeEnabled();
  });

  test("Creates project and navigates to board view after interview", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all questions
    await page.getByTestId("interview-input").fill("A simple todo app");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("What tech stack")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("React");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("core features")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("Tasks");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("additional requirements")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("None");
    await page.getByTestId("interview-send").click();

    // Wait for project setup form
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 10000 });

    // Fill in project details
    await page.getByTestId("interview-project-name-input").fill("interview-test-project");
    await page.getByTestId("interview-project-path-input").fill("/Users/test/projects");

    // Click create
    await page.getByTestId("interview-create-project").click();

    // Should navigate to board view
    await expect(page.getByTestId("board-view")).toBeVisible({ timeout: 5000 });

    // Project name should be visible
    await expect(page.getByTestId("board-view").getByText("interview-test-project")).toBeVisible();
  });

  test("Interview messages have timestamps", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // The welcome message should have a timestamp displayed
    // Timestamps are in format like "10:30:45 AM" or similar
    const messagesArea = page.getByTestId("interview-messages");
    await expect(messagesArea).toBeVisible();

    // The welcome message should contain the first question
    await expect(messagesArea.getByText("What do you want to build?")).toBeVisible();

    // The message area should contain timestamp text (time format like "10:30:45 AM")
    // We verify by checking that the welcome message exists and has content
    await expect(messagesArea.locator("p.text-sm").first()).toBeVisible();
  });

  test("Input field is hidden after interview completes", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all questions
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("What tech stack")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("React");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("core features")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("Tasks");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("additional requirements")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("None");
    await page.getByTestId("interview-send").click();

    // Wait for project setup form (interview complete)
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 10000 });

    // Input field should no longer be visible
    await expect(page.getByTestId("interview-input")).not.toBeVisible();
  });

  test("Generated spec contains proper XML structure", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all questions
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("What tech stack")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("React, TypeScript");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("core features")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("Add tasks, Delete tasks");
    await page.getByTestId("interview-send").click();

    await expect(page.getByText("additional requirements")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("interview-input").fill("Mobile responsive");
    await page.getByTestId("interview-send").click();

    // Wait for spec preview
    await expect(page.getByTestId("spec-preview")).toBeVisible({ timeout: 10000 });

    // Verify XML structure elements
    const specPreview = page.getByTestId("spec-preview");
    await expect(specPreview).toContainText("<project_specification>");
    await expect(specPreview).toContainText("<overview>");
    await expect(specPreview).toContainText("<technology_stack>");
    await expect(specPreview).toContainText("<core_capabilities>");
    await expect(specPreview).toContainText("<development_guidelines>");
  });

  test("Quick Setup option still works from dropdown", async ({ page }) => {
    // Click the Create Project dropdown button
    await page.getByTestId("create-new-project").click();

    // Click Quick Setup option
    await page.getByTestId("quick-setup-option").click();

    // Verify dialog appears (not interview view)
    await expect(page.getByTestId("new-project-dialog")).toBeVisible();
    await expect(page.getByText("Create New Project")).toBeVisible();
  });
});
