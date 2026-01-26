/**
 * トークン使用量
 */
export interface TokenUsage {
  /** 入力トークン数 */
  input_tokens: number;
  /** 出力トークン数 */
  output_tokens: number;
  /** 総トークン数 */
  total_tokens: number;
  /** トークン情報が利用可能か */
  available: boolean;
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  /** LLMレスポンス時間（ミリ秒） */
  llm_duration_ms: number;
  /** コマンド実行時間（ミリ秒） */
  command_duration_ms: number;
  /** ボトルネックのリスト */
  bottlenecks: string[];
}

/**
 * LLM呼び出しメトリクス
 */
export interface LLMMetrics {
  /** タイムスタンプ */
  timestamp: string;
  /** プロバイダ名 */
  provider: string;
  /** モデル名 */
  model: string;
  /** トークン使用量 */
  token_usage: TokenUsage;
  /** パフォーマンスメトリクス */
  performance: PerformanceMetrics;
  /** コマンド名 */
  command: string;
  /** セッションID */
  session_id: string;
}

/**
 * コマンドメトリクス
 */
export interface CommandMetrics {
  /** コマンド名 */
  command: string;
  /** タイムスタンプ */
  timestamp: string;
  /** 実行時間（ミリ秒） */
  duration_ms: number;
  /** LLM呼び出し回数 */
  llm_calls: number;
  /** 総トークン数 */
  total_tokens: number;
  /** 平均レスポンス時間（ミリ秒） */
  avg_response_ms: number;
  /** セッションID */
  session_id: string;
  /** プロバイダ */
  provider: string;
  /** モデル */
  model: string;
}

/**
 * 出力レベル
 */
export type OutputLevel = "minimal" | "normal" | "verbose";

/**
 * メトリクス設定
 */
export interface MetricsConfig {
  /** メトリクス収集を有効にする */
  enabled: boolean;
  /** 自動保存 */
  auto_save: boolean;
  /** 保持期間（日数） */
  retention_days: number;
  /** 出力レベル */
  output_level: OutputLevel;
  /** トークン追跡 */
  track_tokens: boolean;
  /** パフォーマンス追跡 */
  track_performance: boolean;
}

/**
 * メトリクスストレージ
 */
export interface MetricsStorage {
  /** バージョン */
  version: number;
  /** LLM呼び出しメトリクス */
  metrics: LLMMetrics[];
  /** コマンドメトリクス */
  commands: CommandMetrics[];
}

/**
 * 統計情報
 */
export interface MetricsStatistics {
  /** コマンド数 */
  commands: number;
  /** LLM呼び出し回数 */
  llm_calls: number;
  /** 総トークン数 */
  total_tokens: number;
  /** 平均レスポンス時間（ミリ秒） */
  avg_response_ms: number;
  /** 総実行時間（ミリ秒） */
  total_duration_ms: number;
}
