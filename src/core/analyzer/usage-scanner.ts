import type { Pattern } from "../../types/index.js";
import type { SessionInfo } from "./session-parser.js";
import { listSessions, filterSessionsByDate } from "./session-parser.js";
import { readTextFile } from "../../utils/fs.js";

/**
 * 使用状況走査の対象セッション選択オプション
 */
export interface ScanSessionOptions {
  /** 特定プロジェクトのセッションのみ（省略時はカレントディレクトリ） */
  project?: string;
  /** 全プロジェクトのセッションを対象にする */
  all?: boolean;
  /** この日付以降のセッションのみ（YYYY-MM-DD） */
  since?: string;
}

/**
 * 走査対象のセッション一覧を収集する
 * デフォルトはカレントプロジェクトのセッションのみ
 */
export async function collectSessionsForScan(
  options: ScanSessionOptions
): Promise<SessionInfo[]> {
  let sessions: SessionInfo[];
  if (options.all) {
    sessions = await listSessions();
  } else {
    sessions = await listSessions(options.project ?? process.cwd());
  }

  if (options.since) {
    sessions = filterSessionsByDate(sessions, options.since);
  }

  return sessions;
}

/**
 * パターンの使用状況
 */
export interface PatternUsage {
  /** 対象パターン */
  pattern: Pattern;
  /** パターン名が言及されたメッセージ数 */
  useCount: number;
  /** パターン名が言及されたセッション数 */
  sessionCount: number;
  /** 最後に言及された日時（ISO 8601） */
  lastUsedAt?: string;
}

/**
 * 走査対象のメッセージ
 */
export interface ScannableMessage {
  /** system-reminder除去済みのテキスト */
  text: string;
  /** タイムスタンプ（取得できる場合） */
  timestamp?: string;
}

/**
 * <system-reminder>ブロックを除去する
 * CLAUDE.md経由で注入されたpatterns.mdの内容が
 * 使用回数として誤カウントされるのを防ぐ
 */
export function stripSystemReminders(text: string): string {
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "");
}

/**
 * message.contentからテキストを抽出する
 * - 文字列: そのまま
 * - 配列（実際のClaude Codeログ形式）: typeが"text"のブロックのみ結合
 *   （tool_result等のブロックはpatterns.mdの内容を含み
 *   全パターンが誤ヒットするためスキップ）
 */
function extractContentText(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (
        typeof block === "object" &&
        block !== null &&
        (block as Record<string, unknown>).type === "text" &&
        typeof (block as Record<string, unknown>).text === "string"
      ) {
        texts.push((block as Record<string, unknown>).text as string);
      }
    }
    return texts.length > 0 ? texts.join("\n") : null;
  }
  return null;
}

/**
 * JSONLの1エントリから走査対象のメッセージを抽出する
 * user/assistantメッセージのテキスト部分のみを対象とする
 */
export function extractScannableMessage(raw: unknown): ScannableMessage | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const entry = raw as Record<string, unknown>;
  if (entry.type !== "user" && entry.type !== "assistant") {
    return null;
  }
  if (typeof entry.message !== "object" || entry.message === null) {
    return null;
  }

  const text = extractContentText(
    (entry.message as Record<string, unknown>).content
  );
  if (text === null) {
    return null;
  }

  return {
    text: stripSystemReminders(text),
    timestamp:
      typeof entry.timestamp === "string" ? entry.timestamp : undefined,
  };
}

/**
 * JSONLセッションログから走査対象メッセージを抽出する
 */
export function parseScannableMessages(content: string): ScannableMessage[] {
  const messages: ScannableMessage[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const message = extractScannableMessage(JSON.parse(trimmed));
      if (message) {
        messages.push(message);
      }
    } catch {
      // 不正なJSON行はスキップ
      continue;
    }
  }
  return messages;
}

/**
 * メッセージ一覧からパターンごとの言及回数を集計する
 * @returns パターンID -> { count, lastUsedAt }
 */
export function scanMessagesForPatterns(
  messages: ScannableMessage[],
  patterns: Pattern[]
): Map<string, { count: number; lastUsedAt?: string }> {
  const result = new Map<string, { count: number; lastUsedAt?: string }>();

  const lowerNames = patterns.map((p) => ({
    id: p.id,
    lowerName: p.name.toLowerCase(),
  }));

  for (const message of messages) {
    const lowerText = message.text.toLowerCase();
    for (const { id, lowerName } of lowerNames) {
      if (!lowerText.includes(lowerName)) {
        continue;
      }
      const current = result.get(id) ?? { count: 0 };
      current.count += 1;
      if (
        message.timestamp &&
        (!current.lastUsedAt || message.timestamp > current.lastUsedAt)
      ) {
        current.lastUsedAt = message.timestamp;
      }
      result.set(id, current);
    }
  }

  return result;
}

/**
 * 複数セッションを走査してパターンごとの使用状況を集計する
 * 読み込めないセッションはスキップする
 */
export async function scanPatternUsage(
  patterns: Pattern[],
  sessions: SessionInfo[]
): Promise<PatternUsage[]> {
  const usageById = new Map<string, PatternUsage>();
  for (const pattern of patterns) {
    usageById.set(pattern.id, {
      pattern,
      useCount: 0,
      sessionCount: 0,
    });
  }

  for (const session of sessions) {
    let messages: ScannableMessage[];
    try {
      messages = parseScannableMessages(await readTextFile(session.path));
    } catch {
      continue;
    }

    const sessionResult = scanMessagesForPatterns(messages, patterns);
    for (const [id, { count, lastUsedAt }] of sessionResult) {
      const usage = usageById.get(id);
      if (!usage) {
        continue;
      }
      usage.useCount += count;
      usage.sessionCount += 1;
      if (lastUsedAt && (!usage.lastUsedAt || lastUsedAt > usage.lastUsedAt)) {
        usage.lastUsedAt = lastUsedAt;
      }
    }
  }

  // 使用回数の多い順にソート
  return Array.from(usageById.values()).sort(
    (a, b) => b.useCount - a.useCount
  );
}
