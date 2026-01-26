import type { LLMConfig, MetricsConfig } from "../types/index.js";
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
import { MetricsCollectingClient } from "./metrics/wrapper.js";
import { MetricsCollector } from "./metrics/collector.js";

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
 * @param options.metricsConfig - メトリクス設定
 * @param options.commandName - コマンド名（メトリクス用）
 * @param options.sessionId - セッションID（メトリクス用）
 * @param options.metricsCollector - メトリクスコレクター
 * @returns LLMClientインターフェースを実装したオブジェクト
 * @throws サポートされていないプロバイダの場合、またはAPIキーが未設定でフォールバックも不可の場合
 */
export async function createLLMClient(
  config: LLMConfig,
  options: {
    allowFallback?: boolean;
    metricsConfig?: MetricsConfig;
    commandName?: string;
    sessionId?: string;
    metricsCollector?: MetricsCollector;
  } = {}
): Promise<LLMClient> {
  const {
    allowFallback = true,
    metricsConfig,
    commandName = "unknown",
    sessionId,
    metricsCollector,
  } = options;

  // メトリクス有効時の準備
  const enableMetrics =
    metricsConfig?.enabled &&
    metricsCollector &&
    (metricsConfig.track_tokens || metricsConfig.track_performance);

  // メトリクスコレクターが未指定なら新規作成
  const collector =
    metricsCollector || (enableMetrics ? new MetricsCollector(sessionId) : undefined);

  // APIキーが未設定の場合、Claude Codeにフォールバック
  if (allowFallback && needsClaudeCodeFallback(config)) {
    const claudeCodeAvailable = await isClaudeCodeAvailable();
    if (claudeCodeAvailable) {
      console.warn(
        `警告: ${config.api_key_env} が設定されていないため、Claude Codeを使用します。`
      );
      const result = createClaudeCodeClient();
      if (enableMetrics && collector) {
        return new MetricsCollectingClient(
          result.client,
          collector,
          metricsConfig!,
          "claude-code",
          config.model,
          commandName,
          result.extractor
        );
      }
      return result.client;
    }
    // Claude Codeも使えない場合は通常のエラーを出す
  }

  let client: LLMClient;
  let extractor: ((response: any) => any) | undefined;

  switch (config.provider) {
    case "anthropic":
      client = createAnthropicClient(config.model, config.api_key_env);
      break;
    case "openai":
      client = createOpenAIClient(config.model, config.api_key_env, config.base_url);
      break;
    case "gemini":
      client = createGeminiClient(config.model, config.api_key_env);
      break;
    case "ollama":
      client = createOllamaClient(config.model, config.base_url);
      break;
    case "deepseek":
      client = createDeepSeekClient(config.model, config.api_key_env);
      break;
    case "zhipu": {
      const result = createZhipuClient(config.model, config.api_key_env);
      client = result.client;
      extractor = result.extractor;
      break;
    }
    case "claude-code": {
      const result = createClaudeCodeClient();
      client = result.client;
      extractor = result.extractor;
      break;
    }
    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`不明なプロバイダ: ${exhaustiveCheck}`);
    }
  }

  // メトリクス有効時はラップして返す
  if (enableMetrics && collector) {
    return new MetricsCollectingClient(
      client,
      collector,
      metricsConfig!,
      config.provider,
      config.model,
      commandName,
      extractor
    );
  }

  return client;
}
