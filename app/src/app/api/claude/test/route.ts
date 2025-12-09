import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    // Use provided API key or fall back to environment variable
    const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { success: false, error: "No API key provided or configured in environment" },
        { status: 400 }
      );
    }

    // Create Anthropic client with the provided key
    const anthropic = new Anthropic({
      apiKey: effectiveApiKey,
    });

    // Send a simple test prompt
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Respond with exactly: 'Claude SDK connection successful!' and nothing else.",
        },
      ],
    });

    // Check if we got a valid response
    if (response.content && response.content.length > 0) {
      const textContent = response.content.find((block) => block.type === "text");
      if (textContent && textContent.type === "text") {
        return NextResponse.json({
          success: true,
          message: `Connection successful! Response: "${textContent.text}"`,
          model: response.model,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Connection successful! Claude responded.",
      model: response.model,
    });
  } catch (error: unknown) {
    console.error("Claude API test error:", error);

    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { success: false, error: "Invalid API key. Please check your Anthropic API key." },
        { status: 401 }
      );
    }

    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { success: false, error: `API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to connect to Claude API";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
