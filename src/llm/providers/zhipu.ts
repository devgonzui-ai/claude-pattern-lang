import { ZhipuAI } from "zhipuai";
import type { LLMClient } from "../client.js";

/**
 * Zhipu AI (GLM) APIクライアントを作成する
 * @param model - 使用するモデル名 (例: "glm-4", "glm-4-flash", "glm-3-turbo")
 * @param apiKeyEnv - APIキーの環境変数名 (例: "ZHIPUAI_API_KEY")
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws 環境変数が設定されていない場合
 */
export function createZhipuClient(
  model: string,
  apiKeyEnv: string
): LLMClient {
  const apiKey = process.env[apiKeyEnv];

  if (!apiKey) {
    throw new Error(`環境変数 ${apiKeyEnv} が設定されていません`);
  }

  const client = new ZhipuAI({ apiKey });

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
