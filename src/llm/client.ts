import type { LLMConfig } from "../types/index.js";
import { createAnthropicClient } from "./providers/anthropic.js";
import { createOpenAIClient } from "./providers/openai.js";
import { createGeminiClient } from "./providers/gemini.js";
import { createOllamaClient } from "./providers/ollama.js";
import { createDeepSeekClient } from "./providers/deepseek.js";
import { createZhipuClient } from "./providers/zhipu.js";
import {
  createClaudeCodeClient,
  isClaudeCodeAvailable,
} from "./providers/claude-code.js";

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
 * APIキーが設定されているかチェック
 */
function hasApiKey(apiKeyEnv: string): boolean {
  return !!apiKeyEnv && !!process.env[apiKeyEnv];
}

/**
 * Claude Codeへのフォールバックが必要かチェック
 * APIキーが必要なプロバイダーでAPIキーが未設定の場合にtrue
 */
function needsClaudeCodeFallback(config: LLMConfig): boolean {
  // 環境変数でフォールバックを無効化
  if (process.env.CPL_DISABLE_FALLBACK === "1") {
    return false;
  }
  // claude-codeとollamaはAPIキー不要
  if (config.provider === "claude-code" || config.provider === "ollama") {
    return false;
  }
  return !hasApiKey(config.api_key_env);
}

/**
 * 設定に基づいてLLMクライアントを作成する
 * APIキーが設定されていない場合、Claude Codeにフォールバック
 * @param config - LLM設定
 * @param options - オプション
 * @param options.allowFallback - Claude Codeへのフォールバックを許可（デフォルト: true）
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws サポートされていないプロバイダの場合、またはAPIキーが未設定でフォールバックも不可の場合
 */
export async function createLLMClient(
  config: LLMConfig,
  options: { allowFallback?: boolean } = {}
): Promise<LLMClient> {
  const { allowFallback = true } = options;

  // APIキーが未設定の場合、Claude Codeにフォールバック
  if (allowFallback && needsClaudeCodeFallback(config)) {
    const claudeCodeAvailable = await isClaudeCodeAvailable();
    if (claudeCodeAvailable) {
      console.warn(
        `警告: ${config.api_key_env} が設定されていないため、Claude Codeを使用します。`
      );
      return createClaudeCodeClient();
    }
    // Claude Codeも使えない場合は通常のエラーを出す
  }

  switch (config.provider) {
    case "anthropic":
      return createAnthropicClient(config.model, config.api_key_env);
    case "openai":
      return createOpenAIClient(config.model, config.api_key_env, config.base_url);
    case "gemini":
      return createGeminiClient(config.model, config.api_key_env);
    case "ollama":
      return createOllamaClient(config.model, config.base_url);
    case "deepseek":
      return createDeepSeekClient(config.model, config.api_key_env);
    case "zhipu":
      return createZhipuClient(config.model, config.api_key_env);
    case "claude-code":
      return createClaudeCodeClient();
    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`不明なプロバイダ: ${exhaustiveCheck}`);
    }
  }
}
