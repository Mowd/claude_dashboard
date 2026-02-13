import { execSync } from "child_process";
import { readFileSync } from "fs";
import { homedir } from "os";
import path from "path";

interface ClaudeCredentials {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * macOS: 從 Keychain 讀取
 */
function readFromKeychain(): string {
  const raw = execSync(
    'security find-generic-password -s "Claude Code-credentials" -w',
    { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
  return raw;
}

/**
 * Windows / Linux: 從 ~/.claude/.credentials.json 讀取
 */
function readFromCredentialsFile(): string {
  const filePath = path.join(homedir(), ".claude", ".credentials.json");
  return readFileSync(filePath, "utf-8");
}

export function getClaudeOAuthToken(): string {
  try {
    const raw = process.platform === "darwin"
      ? readFromKeychain()
      : readFromCredentialsFile();

    const credentials: ClaudeCredentials = JSON.parse(raw);
    const token = credentials?.claudeAiOauth?.accessToken;
    if (!token) {
      throw new Error("accessToken not found in credential JSON");
    }
    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read Claude Code OAuth token: ${message}`);
  }
}
