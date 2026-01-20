import type { LLMClient } from "../client.js";

/**
 * Anthropic APIクライアントを作成する
 */
export function createAnthropicClient(
  _model: string,
  _apiKeyEnv: string
): LLMClient {
  // TODO: 実装
  return {
    async complete(_prompt: string): Promise<string> {
      throw new Error("未実装");
    },
  };
}
