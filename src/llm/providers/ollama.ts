import { Ollama } from "ollama";
import type { LLMClient } from "../client.js";

/**
 * デフォルトのOllamaホスト
 */
const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

/**
 * Ollama APIクライアントを作成する
 * @param model - 使用するモデル名 (例: "llama3.1", "mistral", "codellama")
 * @param baseURL - カスタムホストURL (省略時は環境変数OLLAMA_HOSTまたはデフォルト値を使用)
 * @returns LLMClientインターフェースを実装したオブジェクト
 */
export function createOllamaClient(model: string, baseURL?: string): LLMClient {
  // ホストの優先順位: 引数 > 環境変数 > デフォルト
  const host = baseURL || process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST;

  const ollama = new Ollama({ host });

  return {
    async complete(prompt: string): Promise<string> {
      const response = await ollama.chat({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.message?.content;
      if (content) {
        return content;
      }

      throw new Error("予期しないレスポンス形式です");
    },
  };
}
