import type { TokenExtractor } from "./interface.js";
import type { TokenUsage } from "../../../types/index.js";
import { unavailableTokenUsage } from "./interface.js";

/**
 * Claude Code CLIからはトークン情報が取得不可
 */
export const claudeCodeTokenExtractor: TokenExtractor<unknown> = {
  extract(_response: unknown): TokenUsage {
    return unavailableTokenUsage;
  },
};
