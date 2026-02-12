import { NextResponse } from "next/server";
import { getClaudeOAuthToken } from "@/lib/usage/get-token";

const ANTHROPIC_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const ANTHROPIC_BETA_HEADER = "oauth-2025-04-20";

/** Shape of a single usage bucket from the Anthropic API */
interface UsageBucket {
  utilization: number;
  resets_at: string | null;
}

/** Full response from Anthropic usage API */
interface AnthropicUsageResponse {
  five_hour: UsageBucket | null;
  seven_day: UsageBucket | null;
  seven_day_sonnet: UsageBucket | null;
  [key: string]: unknown;
}

/** Our simplified response to the frontend */
export interface UsageApiResponse {
  five_hour: UsageBucket | null;
  seven_day: UsageBucket | null;
  seven_day_sonnet: UsageBucket | null;
  error?: string;
}

export async function GET() {
  try {
    // 1. Read token from macOS Keychain
    const token = getClaudeOAuthToken();

    // 2. Call Anthropic usage API
    const response = await fetch(ANTHROPIC_USAGE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": ANTHROPIC_BETA_HEADER,
      },
      // Don't cache — always fetch fresh data
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `[Usage API] Anthropic API returned ${response.status}: ${errorText}`
      );
      return NextResponse.json(
        {
          five_hour: null,
          seven_day: null,
          seven_day_sonnet: null,
          error: `Anthropic API error: ${response.status}`,
        } satisfies UsageApiResponse,
        { status: 502 }
      );
    }

    const data: AnthropicUsageResponse = await response.json();

    // 3. Return only the three buckets the frontend needs
    const result: UsageApiResponse = {
      five_hour: data.five_hour ?? null,
      seven_day: data.seven_day ?? null,
      seven_day_sonnet: data.seven_day_sonnet ?? null,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[Usage API] Error: ${message}`);

    return NextResponse.json(
      {
        five_hour: null,
        seven_day: null,
        seven_day_sonnet: null,
        error: message,
      } satisfies UsageApiResponse,
      { status: 500 }
    );
  }
}
