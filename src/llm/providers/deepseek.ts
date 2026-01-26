import OpenAI from "openai";
import type { LLMClient } from "../client.js";

/**
 * DeepSeek APIのベースURL
 */
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/**
 * DeepSeek APIクライアントを作成する
 * OpenAI互換APIを使用
 * @param model - 使用するモデル名 (例: "deepseek-chat", "deepseek-reasoner")
 * @param apiKeyEnv - APIキーの環境変数名 (例: "DEEPSEEK_API_KEY")
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws 環境変数が設定されていない場合
 */
export function createDeepSeekClient(
  model: string,
  apiKeyEnv: string
): LLMClient {
  const apiKey = process.env[apiKeyEnv];

  if (!apiKey) {
    throw new Error(`環境変数 ${apiKeyEnv} が設定されていません`);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });

  return {
    async complete(prompt: string): Promise<string> {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return content;
      }

      throw new Error("予期しないレスポンス形式です");
    },
  };
}
