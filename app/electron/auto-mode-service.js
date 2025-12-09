const { query, AbortError } = require("@anthropic-ai/claude-agent-sdk");
const path = require("path");
const fs = require("fs/promises");

/**
 * Auto Mode Service - Autonomous feature implementation
 * Automatically picks and implements features from the kanban board
 */
class AutoModeService {
  constructor() {
    this.isRunning = false;
    this.currentFeatureId = null;
    this.abortController = null;
    this.currentQuery = null;
    this.projectPath = null;
    this.sendToRenderer = null;
  }

  /**
   * Start auto mode - continuously implement features
   */
  async start({ projectPath, sendToRenderer }) {
    if (this.isRunning) {
      throw new Error("Auto mode is already running");
    }

    this.isRunning = true;
    this.projectPath = projectPath;
    this.sendToRenderer = sendToRenderer;

    console.log("[AutoMode] Starting auto mode for project:", projectPath);

    // Run the autonomous loop
    this.runLoop().catch((error) => {
      console.error("[AutoMode] Loop error:", error);
      this.stop();
    });

    return { success: true };
  }

  /**
   * Stop auto mode
   */
  async stop() {
    console.log("[AutoMode] Stopping auto mode");

    this.isRunning = false;

    // Abort current agent execution
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.currentQuery = null;

    this.currentFeatureId = null;
    this.projectPath = null;
    this.sendToRenderer = null;

    return { success: true };
  }

  /**
   * Get status of auto mode
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentFeatureId: this.currentFeatureId,
    };
  }

  /**
   * Run a specific feature by ID
   */
  async runFeature({ projectPath, featureId, sendToRenderer }) {
    if (this.isRunning) {
      throw new Error("Auto mode is already running");
    }

    this.isRunning = true;
    this.projectPath = projectPath;
    this.sendToRenderer = sendToRenderer;

    console.log(`[AutoMode] Running specific feature: ${featureId}`);

    try {
      // Load features
      const features = await this.loadFeatures();
      const feature = features.find(f => f.id === featureId);

      if (!feature) {
        throw new Error(`Feature ${featureId} not found`);
      }

      console.log(`[AutoMode] Running feature: ${feature.description}`);
      this.currentFeatureId = feature.id;

      // Update feature status to in_progress
      await this.updateFeatureStatus(featureId, "in_progress");

      this.sendToRenderer({
        type: "auto_mode_feature_start",
        featureId: feature.id,
        feature: feature,
      });

      // Implement the feature
      const result = await this.implementFeature(feature);

      // Update feature status based on result
      const newStatus = result.passes ? "verified" : "backlog";
      await this.updateFeatureStatus(feature.id, newStatus);

      this.sendToRenderer({
        type: "auto_mode_feature_complete",
        featureId: feature.id,
        passes: result.passes,
        message: result.message,
      });

      return { success: true, passes: result.passes };
    } catch (error) {
      console.error("[AutoMode] Error running feature:", error);
      this.sendToRenderer({
        type: "auto_mode_error",
        error: error.message,
        featureId: this.currentFeatureId,
      });
      throw error;
    } finally {
      this.isRunning = false;
      this.currentFeatureId = null;
      this.projectPath = null;
      this.sendToRenderer = null;
    }
  }

  /**
   * Verify a specific feature by running its tests
   */
  async verifyFeature({ projectPath, featureId, sendToRenderer }) {
    console.log(`[AutoMode] verifyFeature called with:`, { projectPath, featureId });

    if (this.isRunning) {
      throw new Error("Auto mode is already running");
    }

    this.isRunning = true;
    this.projectPath = projectPath;
    this.sendToRenderer = sendToRenderer;

    console.log(`[AutoMode] Verifying feature: ${featureId}`);

    try {
      // Load features
      const features = await this.loadFeatures();
      const feature = features.find(f => f.id === featureId);

      if (!feature) {
        throw new Error(`Feature ${featureId} not found`);
      }

      console.log(`[AutoMode] Verifying feature: ${feature.description}`);
      this.currentFeatureId = feature.id;

      this.sendToRenderer({
        type: "auto_mode_feature_start",
        featureId: feature.id,
        feature: feature,
      });

      // Verify the feature by running tests
      const result = await this.verifyFeatureTests(feature);

      // Update feature status based on result
      const newStatus = result.passes ? "verified" : "in_progress";
      await this.updateFeatureStatus(featureId, newStatus);

      this.sendToRenderer({
        type: "auto_mode_feature_complete",
        featureId: feature.id,
        passes: result.passes,
        message: result.message,
      });

      return { success: true, passes: result.passes };
    } catch (error) {
      console.error("[AutoMode] Error verifying feature:", error);
      this.sendToRenderer({
        type: "auto_mode_error",
        error: error.message,
        featureId: this.currentFeatureId,
      });
      throw error;
    } finally {
      this.isRunning = false;
      this.currentFeatureId = null;
      this.projectPath = null;
      this.sendToRenderer = null;
    }
  }

  /**
   * Main autonomous loop - picks and implements features
   */
  async runLoop() {
    while (this.isRunning) {
      try {
        // Load features from feature_list.json
        const features = await this.loadFeatures();

        // Find highest priority incomplete feature
        const nextFeature = this.selectNextFeature(features);

        if (!nextFeature) {
          console.log("[AutoMode] No more features to implement");
          this.sendToRenderer({
            type: "auto_mode_complete",
            message: "All features completed!",
          });
          break;
        }

        console.log(`[AutoMode] Selected feature: ${nextFeature.description}`);
        this.currentFeatureId = nextFeature.id;

        this.sendToRenderer({
          type: "auto_mode_feature_start",
          featureId: nextFeature.id,
          feature: nextFeature,
        });

        // Implement the feature
        const result = await this.implementFeature(nextFeature);

        // Update feature status based on result
        const newStatus = result.passes ? "verified" : "backlog";
        await this.updateFeatureStatus(nextFeature.id, newStatus);

        this.sendToRenderer({
          type: "auto_mode_feature_complete",
          featureId: nextFeature.id,
          passes: result.passes,
          message: result.message,
        });

        // Small delay before next feature
        if (this.isRunning) {
          await this.sleep(3000);
        }
      } catch (error) {
        console.error("[AutoMode] Error in loop iteration:", error);

        this.sendToRenderer({
          type: "auto_mode_error",
          error: error.message,
          featureId: this.currentFeatureId,
        });

        // Wait before retrying
        await this.sleep(5000);
      }
    }

    console.log("[AutoMode] Loop ended");
    this.isRunning = false;
  }

  /**
   * Load features from feature_list.json
   */
  async loadFeatures() {
    const featuresPath = path.join(this.projectPath, ".automaker", "feature_list.json");

    try {
      const content = await fs.readFile(featuresPath, "utf-8");
      const features = JSON.parse(content);

      // Ensure each feature has an ID
      return features.map((f, index) => ({
        ...f,
        id: f.id || `feature-${index}-${Date.now()}`,
      }));
    } catch (error) {
      console.error("[AutoMode] Failed to load features:", error);
      return [];
    }
  }

  /**
   * Select the next feature to implement
   * Prioritizes: earlier features in the list that are not verified
   */
  selectNextFeature(features) {
    // Find first feature that is in backlog or in_progress status
    return features.find((f) => f.status !== "verified");
  }

  /**
   * Write output to feature context file
   */
  async writeToContextFile(featureId, content) {
    if (!this.projectPath) return;

    try {
      const contextDir = path.join(this.projectPath, ".automaker", "context");

      // Ensure directory exists
      try {
        await fs.access(contextDir);
      } catch {
        await fs.mkdir(contextDir, { recursive: true });
      }

      const filePath = path.join(contextDir, `${featureId}.md`);

      // Append to existing file or create new one
      try {
        const existing = await fs.readFile(filePath, "utf-8");
        await fs.writeFile(filePath, existing + content, "utf-8");
      } catch {
        await fs.writeFile(filePath, content, "utf-8");
      }
    } catch (error) {
      console.error("[AutoMode] Failed to write to context file:", error);
    }
  }

  /**
   * Implement a single feature using Claude Agent SDK
   * Uses a Plan-Act-Verify loop with detailed phase logging
   */
  async implementFeature(feature) {
    console.log(`[AutoMode] Implementing: ${feature.description}`);

    try {
      // ========================================
      // PHASE 1: PLANNING
      // ========================================
      const planningMessage = `📋 Planning implementation for: ${feature.description}\n`;
      await this.writeToContextFile(feature.id, planningMessage);

      this.sendToRenderer({
        type: "auto_mode_phase",
        featureId: feature.id,
        phase: "planning",
        message: `Planning implementation for: ${feature.description}`,
      });
      console.log(`[AutoMode] Phase: PLANNING for ${feature.description}`);

      this.abortController = new AbortController();

      // Configure options for the SDK query
      const options = {
        model: "claude-opus-4-5-20251101",
        systemPrompt: this.getCodingPrompt(),
        maxTurns: 30,
        cwd: this.projectPath,
        allowedTools: [
          "Read",
          "Write",
          "Edit",
          "Glob",
          "Grep",
          "Bash",
          "WebSearch",
          "WebFetch",
        ],
        permissionMode: "acceptEdits",
        sandbox: {
          enabled: true,
          autoAllowBashIfSandboxed: true,
        },
        abortController: this.abortController,
      };

      // Build the prompt for this specific feature
      const prompt = this.buildFeaturePrompt(feature);

      // Planning: Analyze the codebase and create implementation plan
      this.sendToRenderer({
        type: "auto_mode_progress",
        featureId: feature.id,
        content: "Analyzing codebase structure and creating implementation plan...",
      });

      // Small delay to show planning phase
      await this.sleep(500);

      // ========================================
      // PHASE 2: ACTION
      // ========================================
      const actionMessage = `⚡ Executing implementation for: ${feature.description}\n`;
      await this.writeToContextFile(feature.id, actionMessage);

      this.sendToRenderer({
        type: "auto_mode_phase",
        featureId: feature.id,
        phase: "action",
        message: `Executing implementation for: ${feature.description}`,
      });
      console.log(`[AutoMode] Phase: ACTION for ${feature.description}`);

      // Send query
      this.currentQuery = query({ prompt, options });

      // Stream responses
      let responseText = "";
      let hasStartedToolUse = false;
      for await (const msg of this.currentQuery) {
        if (!this.isRunning) break;

        if (msg.type === "assistant" && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "text") {
              responseText += block.text;

              // Write to context file
              await this.writeToContextFile(feature.id, block.text);

              // Stream progress to renderer
              this.sendToRenderer({
                type: "auto_mode_progress",
                featureId: feature.id,
                content: block.text,
              });
            } else if (block.type === "tool_use") {
              // First tool use indicates we're actively implementing
              if (!hasStartedToolUse) {
                hasStartedToolUse = true;
                const startMsg = "Starting code implementation...\n";
                await this.writeToContextFile(feature.id, startMsg);
                this.sendToRenderer({
                  type: "auto_mode_progress",
                  featureId: feature.id,
                  content: startMsg,
                });
              }

              // Write tool use to context file
              const toolMsg = `\n🔧 Tool: ${block.name}\n`;
              await this.writeToContextFile(feature.id, toolMsg);

              // Notify about tool use
              this.sendToRenderer({
                type: "auto_mode_tool",
                featureId: feature.id,
                tool: block.name,
                input: block.input,
              });
            }
          }
        }
      }

      this.currentQuery = null;
      this.abortController = null;

      // ========================================
      // PHASE 3: VERIFICATION
      // ========================================
      const verificationMessage = `✅ Verifying implementation for: ${feature.description}\n`;
      await this.writeToContextFile(feature.id, verificationMessage);

      this.sendToRenderer({
        type: "auto_mode_phase",
        featureId: feature.id,
        phase: "verification",
        message: `Verifying implementation for: ${feature.description}`,
      });
      console.log(`[AutoMode] Phase: VERIFICATION for ${feature.description}`);

      const checkingMsg = "Verifying implementation and checking test results...\n";
      await this.writeToContextFile(feature.id, checkingMsg);
      this.sendToRenderer({
        type: "auto_mode_progress",
        featureId: feature.id,
        content: checkingMsg,
      });

      // Re-load features to check if it was marked as verified
      const updatedFeatures = await this.loadFeatures();
      const updatedFeature = updatedFeatures.find((f) => f.id === feature.id);
      const passes = updatedFeature?.status === "verified";

      // Send verification result
      const resultMsg = passes
        ? "✓ Verification successful: All tests passed\n"
        : "✗ Verification: Tests need attention\n";

      await this.writeToContextFile(feature.id, resultMsg);
      this.sendToRenderer({
        type: "auto_mode_progress",
        featureId: feature.id,
        content: resultMsg,
      });

      return {
        passes,
        message: responseText.substring(0, 500), // First 500 chars
      };
    } catch (error) {
      if (error instanceof AbortError || error?.name === "AbortError") {
        console.log("[AutoMode] Feature run aborted");
        this.abortController = null;
        this.currentQuery = null;
        return {
          passes: false,
          message: "Auto mode aborted",
        };
      }

      console.error("[AutoMode] Error implementing feature:", error);

      // Clean up
      this.abortController = null;
      this.currentQuery = null;

      throw error;
    }
  }

  /**
   * Update feature status in feature_list.json
   */
  async updateFeatureStatus(featureId, status) {
    const features = await this.loadFeatures();
    const feature = features.find(f => f.id === featureId);

    if (!feature) {
      console.error(`[AutoMode] Feature ${featureId} not found`);
      return;
    }

    // Update the status field
    feature.status = status;

    // Save back to file
    const featuresPath = path.join(this.projectPath, ".automaker", "feature_list.json");
    const toSave = features.map((f) => ({
      id: f.id,
      category: f.category,
      description: f.description,
      steps: f.steps,
      status: f.status,
    }));

    await fs.writeFile(featuresPath, JSON.stringify(toSave, null, 2), "utf-8");
    console.log(`[AutoMode] Updated feature ${featureId}: status=${status}`);
  }

  /**
   * Verify feature tests (runs tests and checks if they pass)
   */
  async verifyFeatureTests(feature) {
    console.log(`[AutoMode] Verifying tests for: ${feature.description}`);

    try {
      const verifyMsg = `\n✅ Verifying tests for: ${feature.description}\n`;
      await this.writeToContextFile(feature.id, verifyMsg);

      this.sendToRenderer({
        type: "auto_mode_phase",
        featureId: feature.id,
        phase: "verification",
        message: `Verifying tests for: ${feature.description}`,
      });

      this.abortController = new AbortController();

      const options = {
        model: "claude-opus-4-5-20251101",
        systemPrompt: this.getVerificationPrompt(),
        maxTurns: 15,
        cwd: this.projectPath,
        allowedTools: [
          "Read",
          "Write",
          "Edit",
          "Glob",
          "Grep",
          "Bash",
        ],
        permissionMode: "acceptEdits",
        sandbox: {
          enabled: true,
          autoAllowBashIfSandboxed: true,
        },
        abortController: this.abortController,
      };

      const prompt = this.buildVerificationPrompt(feature);

      const runningTestsMsg = "Running Playwright tests to verify feature implementation...\n";
      await this.writeToContextFile(feature.id, runningTestsMsg);

      this.sendToRenderer({
        type: "auto_mode_progress",
        featureId: feature.id,
        content: runningTestsMsg,
      });

      this.currentQuery = query({ prompt, options });

      let responseText = "";
      for await (const msg of this.currentQuery) {
        if (!this.isRunning) break;

        if (msg.type === "assistant" && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "text") {
              responseText += block.text;

              await this.writeToContextFile(feature.id, block.text);

              this.sendToRenderer({
                type: "auto_mode_progress",
                featureId: feature.id,
                content: block.text,
              });
            } else if (block.type === "tool_use") {
              const toolMsg = `\n🔧 Tool: ${block.name}\n`;
              await this.writeToContextFile(feature.id, toolMsg);

              this.sendToRenderer({
                type: "auto_mode_tool",
                featureId: feature.id,
                tool: block.name,
                input: block.input,
              });
            }
          }
        }
      }

      this.currentQuery = null;
      this.abortController = null;

      // Re-load features to check if it was marked as verified
      const updatedFeatures = await this.loadFeatures();
      const updatedFeature = updatedFeatures.find((f) => f.id === feature.id);
      const passes = updatedFeature?.status === "verified";

      const finalMsg = passes
        ? "✓ Verification successful: All tests passed\n"
        : "✗ Tests failed or not all passing - feature remains in progress\n";

      await this.writeToContextFile(feature.id, finalMsg);

      this.sendToRenderer({
        type: "auto_mode_progress",
        featureId: feature.id,
        content: finalMsg,
      });

      return {
        passes,
        message: responseText.substring(0, 500),
      };
    } catch (error) {
      if (error instanceof AbortError || error?.name === "AbortError") {
        console.log("[AutoMode] Verification aborted");
        this.abortController = null;
        this.currentQuery = null;
        return {
          passes: false,
          message: "Verification aborted",
        };
      }

      console.error("[AutoMode] Error verifying feature:", error);
      this.abortController = null;
      this.currentQuery = null;
      throw error;
    }
  }

  /**
   * Build the prompt for implementing a specific feature
   */
  buildFeaturePrompt(feature) {
    return `You are working on a feature implementation task.

**Current Feature to Implement:**

Category: ${feature.category}
Description: ${feature.description}

**Steps to Complete:**
${feature.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Your Task:**

1. Read the project files to understand the current codebase structure
2. Implement the feature according to the description and steps
3. Write Playwright tests to verify the feature works correctly
4. Run the tests and ensure they pass
5. Update feature_list.json to mark this feature as "status": "verified"
6. Commit your changes with git

**Important Guidelines:**

- Focus ONLY on implementing this specific feature
- Write clean, production-quality code
- Add proper error handling
- Write comprehensive Playwright tests
- Ensure all existing tests still pass
- Mark the feature as passing only when all tests are green
- Make a git commit when complete

Begin by reading the project structure and then implementing the feature.`;
  }

  /**
   * Build the prompt for verifying a specific feature
   */
  buildVerificationPrompt(feature) {
    return `You are verifying that a feature implementation is complete and working correctly.

**Feature to Verify:**

ID: ${feature.id}
Category: ${feature.category}
Description: ${feature.description}
Current Status: ${feature.status}

**Steps that should be implemented:**
${feature.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}

**Your Task:**

1. Read the feature_list.json file to see the current status
2. Look for Playwright tests related to this feature
3. Run the Playwright tests for this feature: npx playwright test
4. Check if all tests pass
5. If ALL tests pass:
   - Update feature_list.json to set this feature's "status" to "verified"
   - Explain what tests passed
6. If ANY tests fail:
   - Keep the feature "status" as "in_progress" in feature_list.json
   - Explain what tests failed and why

**Important:**
- Only mark as "verified" if ALL Playwright tests pass
- Do NOT implement new code - only verify existing implementation
- Focus on running tests and updating the status accurately
- Be thorough in checking test results

Begin by reading feature_list.json and finding the appropriate tests to run.`;
  }

  /**
   * Get the system prompt for verification agent
   */
  getVerificationPrompt() {
    return `You are an AI verification agent focused on testing and validation.

Your role is to:
- Run Playwright tests to verify feature implementations
- Accurately report test results
- Update feature status in feature_list.json based on test outcomes
- Only mark features as "verified" when ALL tests pass
- Keep features as "in_progress" if tests fail

You have access to:
- Read and edit files
- Run bash commands (especially Playwright tests)
- Analyze test output

Be accurate and thorough in your verification process.`;
  }

  /**
   * Get the system prompt for coding agent
   */
  getCodingPrompt() {
    return `You are an AI coding agent working autonomously to implement features.

Your role is to:
- Implement features exactly as specified
- Write production-quality code
- Create comprehensive Playwright tests
- Ensure all tests pass before marking features complete
- Commit working code to git
- Be thorough and detail-oriented

You have full access to:
- Read and write files
- Run bash commands
- Execute tests
- Make git commits
- Search and analyze the codebase

Focus on one feature at a time and complete it fully before finishing.`;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new AutoModeService();
