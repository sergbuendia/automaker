import { test, expect } from "@playwright/test";

test.describe("Gemini SDK Integration", () => {
  test.describe("Step 1: Configure Gemini API Key", () => {
    test("can navigate to settings and see Gemini API key input", async ({ page }) => {
      await page.goto("/");

      // Navigate to settings
      await page.getByTestId("settings-button").click();

      // Should see settings view
      await expect(page.getByTestId("settings-view")).toBeVisible();

      // Should see Google/Gemini API key input
      await expect(page.getByTestId("google-api-key-input")).toBeVisible();
      await expect(page.getByText("Google API Key (Gemini)")).toBeVisible();
    });

    test("can enter and save Gemini API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter Gemini API key
      const testKey = "AIzaSyTestGeminiKey123";
      await page.getByTestId("google-api-key-input").fill(testKey);

      // Save settings
      await page.getByTestId("save-settings").click();

      // Should show saved confirmation
      await expect(page.getByText("Saved!")).toBeVisible();

      // Reload and verify persistence
      await page.reload();
      await page.getByTestId("settings-button").click();

      // Toggle visibility to verify saved key
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveValue(testKey);
    });

    test("Gemini API key input is password type by default for security", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Check input type is password (secure)
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "password");
    });

    test("can toggle Gemini API key visibility", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Initially password type
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "password");

      // Toggle to show
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "text");

      // Toggle back to hide
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute("type", "password");
    });
  });

  test.describe("Step 2: Send image/design prompt", () => {
    test("test Gemini connection button exists", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Should see the test Gemini connection button
      await expect(page.getByTestId("test-gemini-connection")).toBeVisible();
    });

    test("test Gemini connection button is disabled without API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Clear any existing key
      await page.getByTestId("google-api-key-input").clear();

      // Button should be disabled
      await expect(page.getByTestId("test-gemini-connection")).toBeDisabled();
    });

    test("test Gemini connection button is enabled with API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter an API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTestKey123");

      // Button should be enabled
      await expect(page.getByTestId("test-gemini-connection")).toBeEnabled();
    });

    test("clicking test button shows loading state", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTestKey123");

      // Mock the API response with a delay to catch loading state
      await page.route("/api/gemini/test", async (route) => {
        // Delay to show loading state
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Connection successful!",
            model: "gemini-1.5-flash",
          }),
        });
      });

      // Click test button
      await page.getByTestId("test-gemini-connection").click();

      // Should show loading state
      await expect(page.getByText("Testing...")).toBeVisible();
    });
  });

  test.describe("Step 3: Verify response received", () => {
    test("shows success message on successful Gemini API test", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTestKey123");

      // Mock successful response
      await page.route("/api/gemini/test", async (route) => {
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

      // Click test button
      await page.getByTestId("test-gemini-connection").click();

      // Should show success result
      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible();
      await expect(page.getByTestId("gemini-test-connection-message")).toContainText("Connection successful");
    });

    test("shows error message on failed Gemini API test", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("invalid-key");

      // Mock error response
      await page.route("/api/gemini/test", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Invalid API key. Please check your Google API key.",
          }),
        });
      });

      // Click test button
      await page.getByTestId("test-gemini-connection").click();

      // Should show error result
      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible();
      await expect(page.getByTestId("gemini-test-connection-message")).toContainText("Invalid API key");
    });

    test("shows network error message on connection failure", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTestKey123");

      // Mock network error
      await page.route("/api/gemini/test", async (route) => {
        await route.abort("connectionfailed");
      });

      // Click test button
      await page.getByTestId("test-gemini-connection").click();

      // Should show error result
      await expect(page.getByTestId("gemini-test-connection-result")).toBeVisible();
      await expect(page.getByTestId("gemini-test-connection-message")).toContainText("Network error");
    });
  });

  test.describe("Gemini API Route - Image/Design Prompt Support", () => {
    test("API route accepts and processes image data for design prompts", async ({ page }) => {
      await page.goto("/");

      // Directly test the API endpoint with image data
      const response = await page.request.post("/api/gemini/test", {
        data: {
          apiKey: "test-key-for-mock",
          imageData: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // 1x1 transparent PNG
          mimeType: "image/png",
          prompt: "Describe this image",
        },
      });

      // We expect some response (even if error due to invalid key)
      const data = await response.json();
      // The endpoint should process the request (not crash)
      expect(data).toHaveProperty("success");
    });

    test("API route handles text-only prompts", async ({ page }) => {
      await page.goto("/");

      // Test the API endpoint with text-only prompt
      const response = await page.request.post("/api/gemini/test", {
        data: {
          apiKey: "test-key",
          prompt: "Hello Gemini",
        },
      });

      // Should return a valid response structure
      const data = await response.json();
      expect(data).toHaveProperty("success");
    });

    test("API route returns error when no API key provided", async ({ page }) => {
      await page.goto("/");

      // Test the API endpoint without API key
      const response = await page.request.post("/api/gemini/test", {
        data: {},
      });

      // Should return error about missing API key
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("No API key");
    });
  });
});
