import { test, expect } from "@playwright/test";

test.describe("Interactive New Project Interview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Step 1: Click 'New Project' -> 'Interactive Mode'", async ({ page }) => {
    // Click the Create Project button to open the dropdown
    await page.getByTestId("create-new-project").click();

    // Verify the dropdown menu is visible
    await expect(page.getByTestId("interactive-mode-option")).toBeVisible();
    await expect(page.getByTestId("quick-setup-option")).toBeVisible();

    // Click on Interactive Mode
    await page.getByTestId("interactive-mode-option").click();

    // Verify we navigate to the interview view
    await expect(page.getByTestId("interview-view")).toBeVisible();
  });

  test("Step 2: Chat interface appears asking 'What do you want to build?'", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Verify the chat interface is present
    await expect(page.getByTestId("interview-messages")).toBeVisible();
    await expect(page.getByTestId("interview-input")).toBeVisible();

    // Verify the first question is asking what to build
    await expect(page.getByText("What do you want to build?")).toBeVisible();
  });

  test("Step 3: User replies 'A todo app'", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Wait for interview view
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Type a response
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    // Verify user message appears in chat
    await expect(page.getByText("A todo app")).toBeVisible();
  });

  test("Step 4: Agent asks clarifying questions (e.g. 'What tech stack?')", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Wait for interview view
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Answer first question
    await page.getByTestId("interview-input").fill("A todo app with tasks and categories");
    await page.getByTestId("interview-send").click();

    // Wait for the next question about tech stack
    await expect(page.getByText("What tech stack would you like to use?")).toBeVisible({ timeout: 3000 });
  });

  test("Step 5: Agent generates draft app_spec.txt based on conversation", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Wait for interview view
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Answer all questions
    // Question 1: What do you want to build?
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    // Wait for question 2
    await expect(page.getByText("What tech stack would you like to use?")).toBeVisible({ timeout: 3000 });

    // Question 2: Tech stack
    await page.getByTestId("interview-input").fill("React, TypeScript, Tailwind CSS");
    await page.getByTestId("interview-send").click();

    // Wait for question 3
    await expect(page.getByText("What are the core features you want to include?")).toBeVisible({ timeout: 3000 });

    // Question 3: Core features
    await page.getByTestId("interview-input").fill("Add tasks, Mark complete, Delete tasks, Categories");
    await page.getByTestId("interview-send").click();

    // Wait for question 4
    await expect(page.getByText("Any additional requirements or preferences?")).toBeVisible({ timeout: 3000 });

    // Question 4: Additional requirements
    await page.getByTestId("interview-input").fill("Mobile responsive, Dark mode support");
    await page.getByTestId("interview-send").click();

    // Wait for spec generation
    await expect(page.getByText("Generating specification")).toBeVisible({ timeout: 3000 });

    // Wait for project setup form to appear
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 5000 });

    // Verify spec preview contains expected content
    await expect(page.getByTestId("spec-preview")).toBeVisible();
    await expect(page.getByTestId("spec-preview")).toContainText("project_specification");
    await expect(page.getByTestId("spec-preview")).toContainText("A todo app");

    // Verify we can enter project name and path
    await expect(page.getByTestId("interview-project-name-input")).toBeVisible();
    await expect(page.getByTestId("interview-project-path-input")).toBeVisible();
  });

  test("shows progress indicator throughout interview", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify header shows question count
    await expect(page.getByText("Question 1 of 4")).toBeVisible();

    // Answer first question
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();

    // Verify progress updates
    await expect(page.getByText("Question 2 of 4")).toBeVisible({ timeout: 3000 });
  });

  test("can navigate back to welcome view", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Verify interview view is displayed
    await expect(page.getByTestId("interview-view")).toBeVisible();

    // Click back button
    await page.getByTestId("interview-back-button").click();

    // Verify we're back at welcome view
    await expect(page.getByTestId("welcome-view")).toBeVisible();
  });

  test("dropdown shows both Quick Setup and Interactive Mode options", async ({ page }) => {
    // Click the Create Project button
    await page.getByTestId("create-new-project").click();

    // Verify both options are present
    await expect(page.getByTestId("quick-setup-option")).toBeVisible();
    await expect(page.getByText("Quick Setup")).toBeVisible();

    await expect(page.getByTestId("interactive-mode-option")).toBeVisible();
    await expect(page.getByText("Interactive Mode")).toBeVisible();
  });

  test("Quick Setup option opens the original new project dialog", async ({ page }) => {
    // Click the Create Project button
    await page.getByTestId("create-new-project").click();

    // Click Quick Setup
    await page.getByTestId("quick-setup-option").click();

    // Verify the original dialog appears
    await expect(page.getByTestId("new-project-dialog")).toBeVisible();
    await expect(page.getByText("Create New Project")).toBeVisible();
  });

  test("can create project after completing interview", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all interview questions
    // Question 1
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();
    await expect(page.getByText("What tech stack would you like to use?")).toBeVisible({ timeout: 3000 });

    // Question 2
    await page.getByTestId("interview-input").fill("React, Node.js");
    await page.getByTestId("interview-send").click();
    await expect(page.getByText("What are the core features you want to include?")).toBeVisible({ timeout: 3000 });

    // Question 3
    await page.getByTestId("interview-input").fill("Add tasks, Delete tasks");
    await page.getByTestId("interview-send").click();
    await expect(page.getByText("Any additional requirements or preferences?")).toBeVisible({ timeout: 3000 });

    // Question 4
    await page.getByTestId("interview-input").fill("None");
    await page.getByTestId("interview-send").click();

    // Wait for project setup form
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 5000 });

    // Fill in project details
    await page.getByTestId("interview-project-name-input").fill("my-todo-app");
    await page.getByTestId("interview-project-path-input").fill("/Users/test/projects");

    // Create project button should be enabled
    await expect(page.getByTestId("interview-create-project")).toBeEnabled();

    // Click create project
    await page.getByTestId("interview-create-project").click();

    // Should navigate to board view with the new project
    await expect(page.getByTestId("board-view")).toBeVisible({ timeout: 5000 });
  });

  test("create project button is disabled without name and path", async ({ page }) => {
    // Navigate to interview view
    await page.getByTestId("create-new-project").click();
    await page.getByTestId("interactive-mode-option").click();

    // Complete all interview questions quickly
    await page.getByTestId("interview-input").fill("A todo app");
    await page.getByTestId("interview-send").click();
    await expect(page.getByText("What tech stack")).toBeVisible({ timeout: 3000 });

    await page.getByTestId("interview-input").fill("React");
    await page.getByTestId("interview-send").click();
    await expect(page.getByText("core features")).toBeVisible({ timeout: 3000 });

    await page.getByTestId("interview-input").fill("Tasks");
    await page.getByTestId("interview-send").click();
    await expect(page.getByText("additional requirements")).toBeVisible({ timeout: 3000 });

    await page.getByTestId("interview-input").fill("None");
    await page.getByTestId("interview-send").click();

    // Wait for project setup form
    await expect(page.getByTestId("project-setup-form")).toBeVisible({ timeout: 5000 });

    // Create button should be disabled initially
    await expect(page.getByTestId("interview-create-project")).toBeDisabled();

    // Fill only name
    await page.getByTestId("interview-project-name-input").fill("my-project");
    await expect(page.getByTestId("interview-create-project")).toBeDisabled();

    // Clear name and fill only path
    await page.getByTestId("interview-project-name-input").clear();
    await page.getByTestId("interview-project-path-input").fill("/some/path");
    await expect(page.getByTestId("interview-create-project")).toBeDisabled();

    // Fill both - should be enabled
    await page.getByTestId("interview-project-name-input").fill("my-project");
    await expect(page.getByTestId("interview-create-project")).toBeEnabled();
  });
});
