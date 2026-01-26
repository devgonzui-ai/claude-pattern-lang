import { GoogleGenAI } from "@google/genai";
import type { LLMClient } from "../client.js";

/**
 * Google Gemini APIクライアントを作成する
 * @param model - 使用するモデル名 (例: "gemini-2.0-flash", "gemini-2.5-pro")
 * @param apiKeyEnv - APIキーの環境変数名 (例: "GEMINI_API_KEY")
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws 環境変数が設定されていない場合
 */
export function createGeminiClient(
  model: string,
  apiKeyEnv: string
): LLMClient {
  const apiKey = process.env[apiKeyEnv];

  if (!apiKey) {
    throw new Error(`環境変数 ${apiKeyEnv} が設定されていません`);
  }

  const ai = new GoogleGenAI({ apiKey });

  return {
    async complete(prompt: string): Promise<string> {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const text = response.text;
      if (text) {
        return text;
      }

      throw new Error("予期しないレスポンス形式です");
    },
  };
}
