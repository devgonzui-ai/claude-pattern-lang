import type { LLMConfig } from "../types/index.js";

/**
 * LLMクライアントインターフェース
 */
export interface LLMClient {
  /**
   * テキスト生成を行う
   */
  complete(prompt: string): Promise<string>;
}

/**
 * 設定に基づいてLLMクライアントを作成する
 */
export async function createLLMClient(_config: LLMConfig): Promise<LLMClient> {
  // TODO: 実装 - プロバイダに応じて適切なクライアントを返す
  throw new Error("未実装");
}
