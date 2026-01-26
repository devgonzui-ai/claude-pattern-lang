import type { TokenExtractor } from "./interface.js";
import type { TokenUsage } from "../../../types/index.js";
import { unavailableTokenUsage } from "./interface.js";

/**
 * Claude Code CLIからはトークン情報が取得不可
 */
export const claudeCodeTokenExtractor: TokenExtractor = {
  extract(_response: any): TokenUsage {
    return unavailableTokenUsage;
  },
};
