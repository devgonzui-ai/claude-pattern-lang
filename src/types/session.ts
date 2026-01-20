/**
 * セッションログのエントリタイプ
 */
export type SessionEntryType =
  | "user"
  | "assistant"
  | "tool_use"
  | "tool_result";

/**
 * ユーザーメッセージエントリ
 */
export interface UserEntry {
  type: "user";
  message: {
    role: "user";
    content: string;
  };
  timestamp: string;
}

/**
 * アシスタントメッセージエントリ
 */
export interface AssistantEntry {
  type: "assistant";
  message: {
    role: "assistant";
    content: string;
  };
  timestamp: string;
}

/**
 * ツール使用エントリ
 */
export interface ToolUseEntry {
  type: "tool_use";
  tool_name: string;
  tool_input: Record<string, unknown>;
  timestamp: string;
}

/**
 * ツール結果エントリ
 */
export interface ToolResultEntry {
  type: "tool_result";
  tool_name: string;
  output: string;
  timestamp: string;
}

/**
 * セッションログエントリ
 */
export type SessionEntry =
  | UserEntry
  | AssistantEntry
  | ToolUseEntry
  | ToolResultEntry;

/**
 * 解析済みセッション情報
 */
export interface AnalyzedSession {
  /** セッションID */
  id: string;
  /** プロジェクトパス */
  project: string;
  /** 解析日時 */
  analyzed_at: string;
  /** メッセージ数 */
  message_count: number;
  /** 抽出されたパターンID */
  extracted_patterns: string[];
}

/**
 * セッションキャッシュ
 */
export interface SessionCache {
  sessions: AnalyzedSession[];
}

/**
 * 解析キュー項目
 */
export interface QueueItem {
  session_id: string;
  project: string;
  added_at: string;
}

/**
 * 解析キュー
 */
export interface AnalysisQueue {
  items: QueueItem[];
}
