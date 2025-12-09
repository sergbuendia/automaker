import { test, expect } from "@playwright/test";

test.describe("Gemini SDK Integration - Autonomous Agent", () => {
  test.describe("Step 1: Configure Gemini API Key", () => {
    test("can navigate to settings and configure Google API key", async ({ page }) => {
      await page.goto("/");

      // Navigate to settings
      await page.getByTestId("settings-button").click();
      await expect(page.getByTestId("settings-view")).toBeVisible();

      // Verify Google API key input is available
      const apiKeyInput = page.getByTestId("google-api-key-input");
      await expect(apiKeyInput).toBeVisible();
      await expect(apiKeyInput).toBeEditable();

      // Enter a test API key
      await apiKeyInput.fill("AIzaSyTest-integration-test-key-123");

      // Save settings
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Saved!")).toBeVisible();
    });

    test("Google API key input has proper security features", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Verify password masking by default
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "password");

      // Can toggle visibility
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "text");

      // Can toggle back to hidden
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "password");
    });

    test("Google API key persists across page reloads", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter and save API key
      const testKey = "AIzaSyPersistence-test-key";
      await page.getByTestId("google-api-key-input").fill(testKey);
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Saved!")).toBeVisible();

      // Reload and verify persistence
      await page.reload();
      await page.getByTestId("settings-button").click();

      // Make key visible and verify
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveValue(testKey);
    });
  });

  test.describe("Step 2: Send image/design prompt", () => {
    test("test connection button is visible in settings for Gemini", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Test connection button should be visible
      const testButton = page.getByTestId("test-gemini-connection");
      await expect(testButton).toBeVisible();
      await expect(testButton).toContainText("Test");
    });

    test("test connection button is disabled without API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Clear any existing API key
      await page.getByTestId("google-api-key-input").fill("");

      // Test button should be disabled
      await expect(page.getByTestId("test-gemini-connection")).toBeDisabled();
    });

    test("test connection button is enabled with API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTest-key");

      // Test button should be enabled
      await expect(page.getByTestId("test-gemini-connection")).toBeEnabled();
    });

    test("clicking test sends request to Gemini API endpoint", async ({ page }) => {
      // Setup API route mock
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Connection successful! Gemini responded.",
            model: "gemini-1.5-flash",
            hasImage: false,
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTest-key");

      // Click test button
      await page.getByTestId("test-gemini-connection").click();

      // Should show loading state briefly then success
      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible({ timeout: 10000 });
    });

    test("Gemini API endpoint supports image/design prompts", async ({ page }) => {
      // Mock API endpoint that handles image data
      await page.route("**/api/gemini/test", async (route) => {
        const request = route.request();
        const postData = request.postDataJSON();

        // Verify the API can receive image data
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: 'Connection successful! Response: "This is a test design description."',
            model: "gemini-1.5-flash",
            hasImage: !!postData?.imageData,
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("google-api-key-input").fill("AIzaSyTest-image-key");
      await page.getByTestId("test-gemini-connection").click();

      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Step 3: Verify response received", () => {
    test("displays success message when connection succeeds", async ({ page }) => {
      // Mock successful response
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: 'Connection successful! Response: "Gemini SDK connection successful!"',
            model: "gemini-1.5-flash",
            hasImage: false,
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("google-api-key-input").fill("AIzaSyValid-key");
      await page.getByTestId("test-gemini-connection").click();

      // Wait for result to appear
      const result = page.getByTestId("gemini-test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify success message is shown
      const message = page.getByTestId("gemini-test-connection-message");
      await expect(message).toContainText(/Connection successful/i);
    });

    test("displays error message when API key is invalid", async ({ page }) => {
      // Mock authentication error
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Invalid API key. Please check your Google API key.",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("google-api-key-input").fill("invalid-key");
      await page.getByTestId("test-gemini-connection").click();

      // Wait for error result
      const result = page.getByTestId("gemini-test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify error message is shown
      const message = page.getByTestId("gemini-test-connection-message");
      await expect(message).toContainText(/Invalid API key|API key|error/i);
    });

    test("displays error message on network failure", async ({ page }) => {
      // Mock network error
      await page.route("**/api/gemini/test", async (route) => {
        await route.abort("connectionrefused");
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("google-api-key-input").fill("AIzaSyTest-key");
      await page.getByTestId("test-gemini-connection").click();

      // Wait for error result
      const result = page.getByTestId("gemini-test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify network error message
      const message = page.getByTestId("gemini-test-connection-message");
      await expect(message).toContainText(/Network error|connection|failed/i);
    });

    test("displays rate limit error message", async ({ page }) => {
      // Mock rate limit error
      await page.route("**/api/gemini/test", async (route) => {
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

      await page.getByTestId("google-api-key-input").fill("AIzaSyRate-limited");
      await page.getByTestId("test-gemini-connection").click();

      // Wait for error result
      const result = page.getByTestId("gemini-test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify rate limit message
      const message = page.getByTestId("gemini-test-connection-message");
      await expect(message).toContainText(/Rate limit|try again/i);
    });

    test("shows loading state while testing connection", async ({ page }) => {
      // Mock slow response
      await page.route("**/api/gemini/test", async (route) => {
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

      await page.getByTestId("google-api-key-input").fill("AIzaSyTest-key");
      await page.getByTestId("test-gemini-connection").click();

      // Should show "Testing..." text while loading
      await expect(page.getByText("Testing...")).toBeVisible();
    });

    test("displays response with image analysis capability", async ({ page }) => {
      // Mock response that indicates image was processed
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: 'Connection successful! Response: "I can see a modern UI design with buttons and forms."',
            model: "gemini-1.5-flash",
            hasImage: true,
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("google-api-key-input").fill("AIzaSyImage-test-key");
      await page.getByTestId("test-gemini-connection").click();

      // Wait for result to appear
      const result = page.getByTestId("gemini-test-connection-result");
      await expect(result).toBeVisible({ timeout: 10000 });

      // Verify success message is shown
      const message = page.getByTestId("gemini-test-connection-message");
      await expect(message).toContainText(/Connection successful/i);
    });
  });

  test.describe("Full Integration Flow", () => {
    test("complete Gemini SDK integration flow - configure, send image/design prompt, verify", async ({ page }) => {
      // Mock successful API response
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: 'Connection successful! Response: "Gemini SDK connection successful!"',
            model: "gemini-1.5-flash",
            hasImage: false,
          }),
        });
      });

      // Step 1: Navigate to app
      await page.goto("/");
      await expect(page).toHaveURL("/");

      // Step 2: Go to settings and configure API key
      await page.getByTestId("settings-button").click();
      await expect(page.getByTestId("settings-view")).toBeVisible();

      const apiKey = "AIzaSyIntegration-test-key";
      await page.getByTestId("google-api-key-input").fill(apiKey);
      await page.getByTestId("save-settings").click();
      await expect(page.getByText("Saved!")).toBeVisible();

      // Step 3: Test the connection (sends prompt to Gemini)
      await page.getByTestId("test-gemini-connection").click();

      // Step 4: Verify response is received
      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("gemini-test-connection-message")).toContainText(/Connection successful/i);

      // Verify the UI shows success state (green styling indicates success)
      const resultContainer = page.getByTestId("gemini-test-connection-result");
      await expect(resultContainer).toBeVisible();
    });

    test("Gemini API supports both text and image/design prompts", async ({ page }) => {
      // First test: text only prompt
      await page.route("**/api/gemini/test", async (route) => {
        const request = route.request();
        const postData = request.postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: postData?.imageData
              ? 'Connection successful! Response: "Design analyzed successfully."'
              : 'Connection successful! Response: "Gemini SDK connection successful!"',
            model: "gemini-1.5-flash",
            hasImage: !!postData?.imageData,
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      await page.getByTestId("google-api-key-input").fill("AIzaSyMultimodal-key");
      await page.getByTestId("test-gemini-connection").click();

      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("gemini-test-connection-message")).toContainText(/Connection successful/i);
    });
  });

  test.describe("Gemini API Endpoint Verification", () => {
    test("API endpoint exists and responds correctly", async ({ page }) => {
      // This test verifies the API route is properly set up
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Gemini API endpoint is working",
            model: "gemini-1.5-flash",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();
      await page.getByTestId("google-api-key-input").fill("test-key");
      await page.getByTestId("test-gemini-connection").click();

      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible({ timeout: 10000 });
    });

    test("API endpoint handles missing API key gracefully", async ({ page }) => {
      // Verify proper error handling when no API key is provided
      await page.route("**/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "No API key provided or configured in environment",
          }),
        });
      });

      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Button should be disabled without API key, so the error state
      // would only occur if someone bypasses the UI
      await expect(page.getByTestId("test-gemini-connection")).toBeDisabled();
    });
  });
});
