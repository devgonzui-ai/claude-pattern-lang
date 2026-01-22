import type { LLMConfig } from "../types/index.js";
import { createAnthropicClient } from "./providers/anthropic.js";

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
 * @param config - LLM設定
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws サポートされていないプロバイダの場合
 */
export async function createLLMClient(config: LLMConfig): Promise<LLMClient> {
  switch (config.provider) {
    case "anthropic":
      return createAnthropicClient(config.model, config.api_key_env);
    case "openai":
    case "local":
      throw new Error(
        `プロバイダ ${config.provider} は現在サポートされていません`
      );
    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`不明なプロバイダ: ${exhaustiveCheck}`);
    }
  }
}
