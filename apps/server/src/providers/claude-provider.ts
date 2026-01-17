/**
 * Claude Provider - Executes queries using Claude Agent SDK
 *
 * Wraps the @anthropic-ai/claude-agent-sdk for seamless integration
 * with the provider architecture.
 */

import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { BaseProvider } from './base-provider.js';
import { classifyError, getUserFriendlyErrorMessage, createLogger } from '@automaker/utils';
import { getClaudeSettingsPath } from '@automaker/platform';
import * as fs from 'fs';

const logger = createLogger('ClaudeProvider');
import { getThinkingTokenBudget, validateBareModelId } from '@automaker/types';
import type {
  ExecuteOptions,
  ProviderMessage,
  InstallationStatus,
  ModelDefinition,
} from './types.js';

// Explicit allowlist of environment variables to pass to the SDK.
// Only these vars are passed - nothing else from process.env leaks through.
const ALLOWED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'PATH',
  'HOME',
  'SHELL',
  'TERM',
  'USER',
  'USERNAME',
  'LANG',
  'LC_ALL',
  // Windows-specific
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
];

/**
 * Load environment variables from Claude CLI settings.json
 */
function loadSettingsEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  try {
    const settingsPath = getClaudeSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings.env && typeof settings.env === 'object') {
        // Add all variables from settings.json env section
        Object.keys(settings.env).forEach((key) => {
          const value = settings.env[key];
          if (typeof value === 'string') {
            env[key] = value;
          }
        });
        if (Object.keys(env).length > 0) {
          logger.info(
            `Loaded ${Object.keys(env).length} environment variable(s) from Claude settings.json: ${Object.keys(env).join(', ')}`
          );
        }
      }
    }
  } catch (error) {
    // Silently ignore errors reading settings.json - it's optional
    logger.debug('Could not read Claude settings.json:', error);
  }

  return env;
}

/**
 * Build environment for the SDK with only explicitly allowed variables
 * Also includes variables from Claude CLI settings.json
 */
function buildEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};

  // First, load variables from settings.json (these take precedence for CLI auth)
  const settingsEnv = loadSettingsEnv();
  Object.assign(env, settingsEnv);

  // Then add allowed variables from process.env (these override settings.json)
  for (const key of ALLOWED_ENV_VARS) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  // Ensure HOME is set (use USERPROFILE on Windows if HOME is not set)
  if (!env.HOME && env.USERPROFILE) {
    env.HOME = env.USERPROFILE;
  }

  return env;
}

export class ClaudeProvider extends BaseProvider {
  getName(): string {
    return 'claude';
  }

  /**
   * Execute a query using Claude Agent SDK
   */
  async *executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage> {
    // Validate that model doesn't have a provider prefix
    // AgentService should strip prefixes before passing to providers
    validateBareModelId(options.model, 'ClaudeProvider');

    const {
      prompt,
      model,
      cwd,
      systemPrompt,
      maxTurns = 20,
      allowedTools,
      abortController,
      conversationHistory,
      sdkSessionId,
      thinkingLevel,
    } = options;

    // Convert thinking level to token budget
    const maxThinkingTokens = getThinkingTokenBudget(thinkingLevel);

    // Build Claude SDK options
    const sdkOptions: Options = {
      model,
      systemPrompt,
      maxTurns,
      cwd,
      // Pass only explicitly allowed environment variables to SDK
      env: buildEnv(),
      // Pass through allowedTools if provided by caller (decided by sdk-options.ts)
      ...(allowedTools && { allowedTools }),
      // AUTONOMOUS MODE: Always bypass permissions for fully autonomous operation
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      abortController,
      // Resume existing SDK session if we have a session ID
      ...(sdkSessionId && conversationHistory && conversationHistory.length > 0
        ? { resume: sdkSessionId }
        : {}),
      // Forward settingSources for CLAUDE.md file loading
      ...(options.settingSources && { settingSources: options.settingSources }),
      // Forward MCP servers configuration
      ...(options.mcpServers && { mcpServers: options.mcpServers }),
      // Extended thinking configuration
      ...(maxThinkingTokens && { maxThinkingTokens }),
      // Subagents configuration for specialized task delegation
      ...(options.agents && { agents: options.agents }),
    };

    // Build prompt payload
    let promptPayload: string | AsyncIterable<any>;

    if (Array.isArray(prompt)) {
      // Multi-part prompt (with images)
      promptPayload = (async function* () {
        const multiPartPrompt = {
          type: 'user' as const,
          session_id: '',
          message: {
            role: 'user' as const,
            content: prompt,
          },
          parent_tool_use_id: null,
        };
        yield multiPartPrompt;
      })();
    } else {
      // Simple text prompt
      promptPayload = prompt;
    }

    // Execute via Claude Agent SDK
    try {
      const stream = query({ prompt: promptPayload, options: sdkOptions });

      // Stream messages directly - they're already in the correct format
      for await (const msg of stream) {
        yield msg as ProviderMessage;
      }
    } catch (error) {
      // Enhance error with user-friendly message and classification
      const errorInfo = classifyError(error);
      const userMessage = getUserFriendlyErrorMessage(error);

      logger.error('executeQuery() error during execution:', {
        type: errorInfo.type,
        message: errorInfo.message,
        isRateLimit: errorInfo.isRateLimit,
        retryAfter: errorInfo.retryAfter,
        stack: (error as Error).stack,
      });

      // Build enhanced error message with additional guidance for rate limits
      const message = errorInfo.isRateLimit
        ? `${userMessage}\n\nTip: If you're running multiple features in auto-mode, consider reducing concurrency (maxConcurrency setting) to avoid hitting rate limits.`
        : userMessage;

      const enhancedError = new Error(message);
      (enhancedError as any).originalError = error;
      (enhancedError as any).type = errorInfo.type;

      if (errorInfo.isRateLimit) {
        (enhancedError as any).retryAfter = errorInfo.retryAfter;
      }

      throw enhancedError;
    }
  }

  /**
   * Detect Claude SDK installation (always available via npm)
   */
  async detectInstallation(): Promise<InstallationStatus> {
    // Claude SDK is always available since it's a dependency
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    const status: InstallationStatus = {
      installed: true,
      method: 'sdk',
      hasApiKey,
      authenticated: hasApiKey,
    };

    return status;
  }

  /**
   * Get available Claude models
   */
  getAvailableModels(): ModelDefinition[] {
    const models = [
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        modelString: 'claude-opus-4-5-20251101',
        provider: 'anthropic',
        description: 'Most capable Claude model',
        contextWindow: 200000,
        maxOutputTokens: 16000,
        supportsVision: true,
        supportsTools: true,
        tier: 'premium' as const,
        default: true,
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        modelString: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        description: 'Balanced performance and cost',
        contextWindow: 200000,
        maxOutputTokens: 16000,
        supportsVision: true,
        supportsTools: true,
        tier: 'standard' as const,
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        modelString: 'claude-3-5-sonnet-20241022',
        provider: 'anthropic',
        description: 'Fast and capable',
        contextWindow: 200000,
        maxOutputTokens: 8000,
        supportsVision: true,
        supportsTools: true,
        tier: 'standard' as const,
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        modelString: 'claude-haiku-4-5-20251001',
        provider: 'anthropic',
        description: 'Fastest Claude model',
        contextWindow: 200000,
        maxOutputTokens: 8000,
        supportsVision: true,
        supportsTools: true,
        tier: 'basic' as const,
      },
    ] satisfies ModelDefinition[];
    return models;
  }

  /**
   * Check if the provider supports a specific feature
   */
  supportsFeature(feature: string): boolean {
    const supportedFeatures = ['tools', 'text', 'vision', 'thinking'];
    return supportedFeatures.includes(feature);
  }
}
