import { execSync } from "child_process";

interface KeychainCredentials {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Read the Claude Code OAuth access token from macOS Keychain.
 *
 * The credential is stored by Claude Code under the service name
 * "Claude Code-credentials" as a JSON blob containing an
 * `claudeAiOauth.accessToken` field.
 *
 * @returns The OAuth access token string
 * @throws Error if Keychain access fails or the credential format is unexpected
 */
export function getClaudeOAuthToken(): string {
  try {
    const raw = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"], // suppress stderr
      }
    ).trim();

    const credentials: KeychainCredentials = JSON.parse(raw);

    const token = credentials?.claudeAiOauth?.accessToken;
    if (!token) {
      throw new Error(
        "accessToken not found in Keychain credential JSON"
      );
    }

    return token;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read Claude Code token from Keychain: ${message}`);
  }
}
