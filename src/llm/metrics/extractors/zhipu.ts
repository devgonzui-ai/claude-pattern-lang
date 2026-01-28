import type { TokenExtractor } from "./interface.js";
import type { TokenUsage } from "../../../types/index.js";
import { unavailableTokenUsage } from "./interface.js";

/**
 * Zhipu AI API レスポンスからトークン使用量を抽出
 */
export const zhipuTokenExtractor: TokenExtractor<unknown> = {
  extract(response: unknown): TokenUsage {
    try {
      const usage = (response as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } })?.usage;
      if (!usage) {
        return unavailableTokenUsage;
      }

      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;

      return {
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        total_tokens: totalTokens,
        available: true,
      };
    } catch {
      return unavailableTokenUsage;
    }
  },
};
