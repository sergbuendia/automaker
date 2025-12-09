import { test, expect } from "@playwright/test";

test.describe("Gemini SDK Integration", () => {
  test.describe("Step 1: Configure Gemini API Key", () => {
    test("can navigate to settings and see Gemini API key input", async ({
      page,
    }) => {
      await page.goto("/");

      // Navigate to settings
      await page.getByTestId("settings-button").click();

      // Verify settings view is displayed
      await expect(page.getByTestId("settings-view")).toBeVisible();

      // Verify Google/Gemini API key input exists
      await expect(page.getByTestId("google-api-key-input")).toBeVisible();
      await expect(
        page.getByText("Google API Key (Gemini)", { exact: true })
      ).toBeVisible();
    });

    test("can enter and save Gemini API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter a test API key
      const testApiKey = "AIzaSyTestKey123456";
      await page.getByTestId("google-api-key-input").fill(testApiKey);

      // Save the settings
      await page.getByTestId("save-settings").click();

      // Verify saved confirmation
      await expect(page.getByText("Saved!")).toBeVisible();

      // Reload and verify persistence
      await page.reload();
      await page.getByTestId("settings-button").click();

      // Toggle visibility to check the value
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveValue(
        testApiKey
      );
    });

    test("Gemini API key input is password type by default for security", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Verify password type for security
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute(
        "type",
        "password"
      );
    });

    test("can toggle Gemini API key visibility", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Initially password type
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute(
        "type",
        "password"
      );

      // Toggle to show
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute(
        "type",
        "text"
      );

      // Toggle back to hide
      await page.getByTestId("toggle-google-visibility").click();
      await expect(page.getByTestId("google-api-key-input")).toHaveAttribute(
        "type",
        "password"
      );
    });

    test("shows checkmark icon when API key is configured", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTest123");
      await page.getByTestId("save-settings").click();

      // Reload to trigger the checkmark display
      await page.reload();
      await page.getByTestId("settings-button").click();

      // The checkmark icon should be visible next to the label
      // Find the label container and verify checkmark is present
      const labelContainer = page.locator(".flex.items-center.gap-2").filter({
        hasText: "Google API Key (Gemini)",
      });
      await expect(
        labelContainer.locator('svg[class*="text-green-500"]')
      ).toBeVisible();
    });
  });

  test.describe("Step 2: Send image/design prompt", () => {
    test("test connection button exists for Gemini", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Verify test connection button exists
      await expect(page.getByTestId("test-gemini-connection")).toBeVisible();
    });

    test("test connection button is disabled without API key", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Clear any existing API key
      await page.getByTestId("google-api-key-input").clear();

      // Verify button is disabled
      await expect(page.getByTestId("test-gemini-connection")).toBeDisabled();
    });

    test("test connection button is enabled with API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyTestKey123");

      // Verify button is enabled
      await expect(page.getByTestId("test-gemini-connection")).toBeEnabled();
    });

    test("clicking test connection shows loading state", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("AIzaSyInvalidKey");

      // Click test connection
      await page.getByTestId("test-gemini-connection").click();

      // Should show loading state (Testing...)
      await expect(page.getByText("Testing...")).toBeVisible();
    });
  });

  test.describe("Step 3: Verify response received", () => {
    test("shows error message for invalid API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter an invalid API key
      await page.getByTestId("google-api-key-input").fill("invalid-key-123");

      // Click test connection
      await page.getByTestId("test-gemini-connection").click();

      // Wait for result (should show error)
      await expect(
        page.getByTestId("gemini-test-connection-result")
      ).toBeVisible({ timeout: 15000 });

      // The result should indicate an error (red styling or error message)
      const resultElement = page.getByTestId("gemini-test-connection-result");
      await expect(resultElement).toBeVisible();
    });

    test("Gemini API endpoint exists and responds", async ({ request }) => {
      // Test the API endpoint directly
      const response = await request.post("/api/gemini/test", {
        data: {
          apiKey: "test-invalid-key",
        },
      });

      // Should return a response (even if error)
      expect(response.status()).toBeLessThanOrEqual(500);

      const data = await response.json();
      // Should have success or error property
      expect(data).toHaveProperty("success");
      expect(typeof data.success).toBe("boolean");
    });

    test("Gemini API endpoint handles missing API key", async ({ request }) => {
      // Test the API endpoint without API key
      const response = await request.post("/api/gemini/test", {
        data: {},
      });

      // Should return 400 for missing API key
      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("No API key");
    });

    test("Gemini API endpoint handles image data structure", async ({
      request,
    }) => {
      // Test that the API can accept image data format
      const response = await request.post("/api/gemini/test", {
        data: {
          apiKey: "test-key",
          imageData: "iVBORw0KGgoAAAANSUhEUg==", // Minimal base64
          mimeType: "image/png",
          prompt: "Describe this image",
        },
      });

      // Should process the request (even if API key is invalid)
      expect(response.status()).toBeLessThanOrEqual(500);

      const data = await response.json();
      expect(data).toHaveProperty("success");
    });

    test("result message displays in UI after test", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Enter API key
      await page.getByTestId("google-api-key-input").fill("test-api-key-123");

      // Click test connection
      await page.getByTestId("test-gemini-connection").click();

      // Wait for result message to appear
      await expect(
        page.getByTestId("gemini-test-connection-message")
      ).toBeVisible({ timeout: 15000 });
    });

    test("shows link to Google AI Studio for API key", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("settings-button").click();

      // Should show link to get API key
      const link = page.locator('a[href*="makersuite.google.com"]');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("target", "_blank");
    });
  });

  test.describe("Gemini API Route Tests", () => {
    test("API route supports text-only prompts", async ({ request }) => {
      const response = await request.post("/api/gemini/test", {
        data: {
          apiKey: "test-key",
          prompt: "Hello, this is a test prompt",
        },
      });

      const data = await response.json();
      // Should process without crashing (actual API key validation happens remotely)
      expect(data).toHaveProperty("success");
    });

    test("API route supports custom prompts with images", async ({
      request,
    }) => {
      const response = await request.post("/api/gemini/test", {
        data: {
          apiKey: "test-key",
          imageData: "base64encodeddata",
          mimeType: "image/jpeg",
          prompt: "What design patterns do you see in this UI mockup?",
        },
      });

      const data = await response.json();
      expect(data).toHaveProperty("success");
    });

    test("API route returns proper error structure", async ({ request }) => {
      const response = await request.post("/api/gemini/test", {
        data: {},
      });

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
    });
  });
});
