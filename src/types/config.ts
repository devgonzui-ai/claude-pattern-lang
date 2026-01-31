import type { MetricsConfig } from "./metrics.js";

/**
 * サポート言語
 */
export type Language = "en" | "ja";

/**
 * LLMプロバイダ
 */
export type LLMProvider =
  | "anthropic"
  | "openai"
  | "gemini"
  | "ollama"
  | "deepseek"
  | "claude-code";

/**
 * LLM設定
 */
export interface LLMConfig {
  /** LLMプロバイダ */
  provider: LLMProvider;
  /** モデル名 */
  model: string;
  /** APIキーの環境変数名 */
  api_key_env: string;
  /** ベースURL (DeepSeek、Ollama等のカスタムエンドポイント用) */
  base_url?: string;
}

/**
 * 解析設定
 */
export interface AnalysisConfig {
  /** セッション終了時に自動解析 */
  auto_analyze: boolean;
  /** 解析対象の最小メッセージ数 */
  min_session_length: number;
  /** 除外するパターン (glob) */
  exclude_patterns: string[];
}

/**
 * 同期設定
 */
export interface SyncConfig {
  /** 解析後に自動でCLAUDE.mdに反映 */
  auto_sync: boolean;
  /** 同期対象プロジェクト (glob) */
  target_projects: string[];
}

/**
 * 設定ファイル
 */
export interface Config {
  version: number;
  language: Language;
  llm: LLMConfig;
  analysis: AnalysisConfig;
  sync: SyncConfig;
  metrics: MetricsConfig;
}

/**
 * デフォルト設定
 */
export const DEFAULT_CONFIG: Config = {
  version: 1,
  language: "en",
  llm: {
    provider: "claude-code",
    model: "claude-opus-4-20250514",
    api_key_env: "",
  },
  analysis: {
    auto_analyze: false,
    min_session_length: 5,
    exclude_patterns: [],
  },
  sync: {
    auto_sync: false,
    target_projects: [],
  },
  metrics: {
    enabled: false,
    auto_save: true,
    retention_days: 30,
    output_level: "normal",
    track_tokens: true,
    track_performance: true,
  },
};
