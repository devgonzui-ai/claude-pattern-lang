import Anthropic from "@anthropic-ai/sdk";
import type { LLMClient } from "../client.js";

/**
 * Anthropic APIクライアントを作成する
 * @param model - 使用するモデル名 (例: "claude-sonnet-4-20250514")
 * @param apiKeyEnv - APIキーの環境変数名 (例: "ANTHROPIC_API_KEY")
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws 環境変数が設定されていない場合
 */
export function createAnthropicClient(
  model: string,
  apiKeyEnv: string
): LLMClient {
  const apiKey = process.env[apiKeyEnv];

  if (!apiKey) {
    throw new Error(`環境変数 ${apiKeyEnv} が設定されていません`);
  }

  const client = new Anthropic({
    apiKey,
  });

  return {
    async complete(prompt: string): Promise<string> {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // レスポンスからテキストを抽出
      const content = response.content[0];
      if (content.type === "text") {
        return content.text;
      }

      throw new Error("予期しないレスポンス形式です");
    },
  };
}
