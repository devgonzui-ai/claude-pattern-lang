import type { LLMClient } from "../client.js";

/**
 * OpenAI APIクライアントを作成する
 */
export function createOpenAIClient(
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
