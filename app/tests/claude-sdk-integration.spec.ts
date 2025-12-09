import { test, expect } from "@playwright/test";

test.describe("Claude SDK Integration - Autonomous Agent", () => {
  test.describe("Step 1: Configure API Key", () => {
    test("can navigate to settings and configure Anthropic API key", async ({ page }) => {
      await page.goto("/");

      // Navigate to settings
      await page.getByTestId("settings-button").click();
      await expect(page.getByTestId("settings-view")).toBeVisible();

      // Verify Anthropic API key input is available
      const apiKeyInput = page.getByTestId("anthropic-api-key-input");
      await expect(apiKeyInput).toBeVisible();
      await expect(apiKeyInput).toBeEditable();

      // Enter a test API key
      await apiKeyInput.fill("sk-ant-api03-test-key-for-integration-test");

      // Save settings
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Saved!")).toBeVisible();
    });

    test("API key input has proper security features", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Verify password masking by default
      await expect(page.getByTestId("anthropic-api-key-input")).toHaveAttribute("type", "password");

      // Can toggle visibility
      await page.getByTestId("toggle-anthropic-visibility").click();
      await expect(page.getByTestId("anthropic-api-key-input")).toHaveAttribute("type", "text");

      // Can toggle back to hidden
      await page.getByTestId("toggle-anthropic-visibility").click();
      await expect(page.getByTestId("anthropic-api-key-input")).toHaveAttribute("type", "password");
    });

    test("API key persists across page reloads", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter and save API key
      const testKey = "sk-ant-api03-persistence-test-key";
      await page.getByTestId("anthropic-api-key-input").fill(testKey);
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Saved!")).toBeVisible();

      // Reload and verify persistence
      await page.reload();
      await page.getByTestId("settings-button").click();

      // Make key visible and verify
      await page.getByTestId("toggle-anthropic-visibility").click();
      await expect(page.getByTestId("anthropic-api-key-input")).toHaveValue(testKey);
    });
  });

  test.describe("Step 2: Send test prompt", () => {
    test("test connection button is visible in settings", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Test connection button should be visible
      const testButton = page.getByTestId("test-claude-connection");
      await expect(testButton).toBeVisible();
      await expect(testButton).toContainText("Test");
    });

    test("test connection button is disabled without API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Clear any existing API key
      await page.getByTestId("anthropic-api-key-input").fill("");

      // Test button should be disabled
      await expect(page.getByTestId("test-claude-connection")).toBeDisabled();
    });

    test("test connection button is enabled with API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("anthropic-api-key-input").fill("sk-ant-test-key");

      // Test button should be enabled
      await expect(page.getByTestId("test-claude-connection")).toBeEnabled();
    });

    test("clicking test sends request to Claude API endpoint", async ({ page }) => {
      // Setup API route mock
      await page.route("**/api/claude/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Connection successful! Claude responded.",
            model: "claude-sonnet-4-20250514",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("anthropic-api-key-input").fill("sk-ant-test-key");

      // Click test button
      await page.getByTestId("test-claude-connection").click();

      // Should show loading state briefly then success
      await expect(page.getByTestId("test-connection-result")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Step 3: Verify response received", () => {
    test("displays success message when connection succeeds", async ({ page }) => {
      // Mock successful response
      await page.route("**/api/claude/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: 'Connection successful! Response: "Claude SDK connection successful!"',
            model: "claude-sonnet-4-20250514",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("anthropic-api-key-input").fill("sk-ant-valid-key");
      await page.getByTestId("test-claude-connection").click();

      // Wait for result to appear
      const result = page.getByTestId("test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify success message is shown
      const message = page.getByTestId("test-connection-message");
      await expect(message).toContainText(/Connection successful/i);
    });

    test("displays error message when API key is invalid", async ({ page }) => {
      // Mock authentication error
      await page.route("**/api/claude/test", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Invalid API key. Please check your Anthropic API key.",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("anthropic-api-key-input").fill("invalid-key");
      await page.getByTestId("test-claude-connection").click();

      // Wait for error result
      const result = page.getByTestId("test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify error message is shown
      const message = page.getByTestId("test-connection-message");
      await expect(message).toContainText(/Invalid API key|API key|error/i);
    });

    test("displays error message on network failure", async ({ page }) => {
      // Mock network error
      await page.route("**/api/claude/test", async (route) => {
        await route.abort("connectionrefused");
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("anthropic-api-key-input").fill("sk-ant-test-key");
      await page.getByTestId("test-claude-connection").click();

      // Wait for error result
      const result = page.getByTestId("test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify network error message
      const message = page.getByTestId("test-connection-message");
      await expect(message).toContainText(/Network error|connection|failed/i);
    });

    test("displays rate limit error message", async ({ page }) => {
      // Mock rate limit error
      await page.route("**/api/claude/test", async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Please try again later.",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("anthropic-api-key-input").fill("sk-ant-rate-limited");
      await page.getByTestId("test-claude-connection").click();

      // Wait for error result
      const result = page.getByTestId("test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify rate limit message
      const message = page.getByTestId("test-connection-message");
      await expect(message).toContainText(/Rate limit|try again/i);
    });

    test("shows loading state while testing connection", async ({ page }) => {
      // Mock slow response
      await page.route("**/api/claude/test", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Connection successful!",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("anthropic-api-key-input").fill("sk-ant-test-key");
      await page.getByTestId("test-claude-connection").click();

      // Should show "Testing..." text while loading
      await expect(page.getByText("Testing...")).toBeVisible();
    });
  });

  test.describe("Full Integration Flow", () => {
    test("complete Claude SDK integration flow - configure, test, verify", async ({ page }) => {
      // Mock successful API response
      await page.route("**/api/claude/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: 'Connection successful! Response: "Claude SDK connection successful!"',
            model: "claude-sonnet-4-20250514",
          }),
        });
      });

      // Step 1: Navigate to app
      await page.goto("/");
      await expect(page).toHaveURL("/");

      // Step 2: Go to settings and configure API key
      await page.getByTestId("settings-button").click();
      await expect(page.getByTestId("settings-view")).toBeVisible();

      const apiKey = "sk-ant-api03-integration-test-key";
      await page.getByTestId("anthropic-api-key-input").fill(apiKey);
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Saved!")).toBeVisible();

      // Step 3: Test the connection
      await page.getByTestId("test-claude-connection").click();

      // Step 4: Verify response is received
      await expect(page.getByTestId("test-connection-result")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("test-connection-message")).toContainText(/Connection successful/i);

      // Verify the UI shows success state (green styling indicates success)
      const resultContainer = page.getByTestId("test-connection-result");
      await expect(resultContainer).toBeVisible();
    });
  });
});
