/**
 * パターンの種類
 */
export type PatternType = "prompt" | "solution" | "code";

/**
 * パターン定義
 */
export interface Pattern {
  /** ユニークID (UUID) */
  id: string;
  /** パターン名 */
  name: string;
  /** パターンの種類 */
  type: PatternType;
  /** 使用場面の説明 */
  context: string;
  /** 解決する問題（任意） */
  problem?: string;
  /** 解決策の要約 */
  solution: string;
  /** 使用例（任意） */
  example?: string;
  /** プロンプト例（type=promptの場合） */
  example_prompt?: string;
  /** 関連パターン名（任意） */
  related?: string[];
  /** 検索用タグ（任意） */
  tags?: string[];
  /** 抽出元セッションID（自動） */
  source_sessions?: string[];
  /** 作成日時（自動） */
  created_at: string;
  /** 更新日時（自動） */
  updated_at: string;
  /** 使用回数（将来用） */
  usage_count?: number;
}

/**
 * パターン作成時の入力
 */
export interface PatternInput {
  name: string;
  type: PatternType;
  context: string;
  problem?: string;
  solution: string;
  example?: string;
  example_prompt?: string;
  related?: string[];
  tags?: string[];
}

/**
 * パターンカタログ（YAML形式）
 */
export interface PatternCatalog {
  patterns: Pattern[];
}
