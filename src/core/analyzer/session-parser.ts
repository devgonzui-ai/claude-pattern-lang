import { homedir } from "node:os";
import { readdir, stat } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import type {
  SessionEntry,
  UserEntry,
  AssistantEntry,
  ToolUseEntry,
  ToolResultEntry,
} from "../../types/index.js";
import { readTextFile } from "../../utils/fs.js";

/**
 * セッション情報
 */
export interface SessionInfo {
  /** セッションID */
  id: string;
  /** プロジェクトパス（エンコード済み） */
  project: string;
  /** セッションファイルのパス */
  path: string;
  /** タイムスタンプ（取得できる場合） */
  timestamp?: string;
}

/**
 * Claude Codeのセッションディレクトリパスを取得
 */
export function getClaudeProjectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * プロジェクトパスをClaude形式のエンコード済みパスに変換
 * 例: /home/user/project -> -home-user-project
 */
export function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

/**
 * エンコード済みパスを元のプロジェクトパスに戻す
 * 例: -home-user-project -> /home/user/project
 */
export function decodeProjectPath(encodedPath: string): string {
  // 先頭のハイフンをスラッシュに置換、以降のハイフンもスラッシュに
  if (encodedPath.startsWith("-")) {
    return encodedPath.replace(/-/g, "/");
  }
  return encodedPath;
}

/**
 * セッションファイルパスからセッション情報を抽出
 */
export function getSessionInfo(sessionPath: string): SessionInfo {
  const fileName = basename(sessionPath, ".jsonl");
  const projectDir = basename(dirname(sessionPath));

  return {
    id: fileName,
    project: projectDir,
    path: sessionPath,
  };
}

/**
 * エントリがUserEntryかどうかを判定
 */
function isUserEntry(entry: unknown): entry is UserEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    e.type === "user" &&
    typeof e.message === "object" &&
    e.message !== null &&
    (e.message as Record<string, unknown>).role === "user" &&
    typeof (e.message as Record<string, unknown>).content === "string" &&
    typeof e.timestamp === "string"
  );
}

/**
 * エントリがAssistantEntryかどうかを判定
 */
function isAssistantEntry(entry: unknown): entry is AssistantEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    e.type === "assistant" &&
    typeof e.message === "object" &&
    e.message !== null &&
    (e.message as Record<string, unknown>).role === "assistant" &&
    typeof (e.message as Record<string, unknown>).content === "string" &&
    typeof e.timestamp === "string"
  );
}

/**
 * エントリがToolUseEntryかどうかを判定
 */
function isToolUseEntry(entry: unknown): entry is ToolUseEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    e.type === "tool_use" &&
    typeof e.tool_name === "string" &&
    typeof e.tool_input === "object" &&
    e.tool_input !== null &&
    typeof e.timestamp === "string"
  );
}

/**
 * エントリがToolResultEntryかどうかを判定
 */
function isToolResultEntry(entry: unknown): entry is ToolResultEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    e.type === "tool_result" &&
    typeof e.tool_name === "string" &&
    typeof e.output === "string" &&
    typeof e.timestamp === "string"
  );
}

/**
 * パースした行がSessionEntryかどうかを判定して変換
 */
function parseEntry(entry: unknown): SessionEntry | null {
  if (isUserEntry(entry)) {
    return entry;
  }
  if (isAssistantEntry(entry)) {
    return entry;
  }
  if (isToolUseEntry(entry)) {
    return entry;
  }
  if (isToolResultEntry(entry)) {
    return entry;
  }
  return null;
}

/**
 * JSONLセッションログをパースする
 */
export async function parseSessionLog(
  filePath: string
): Promise<SessionEntry[]> {
  const content = await readTextFile(filePath);
  const lines = content.split("\n");
  const entries: SessionEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      const entry = parseEntry(parsed);
      if (entry) {
        entries.push(entry);
      }
    } catch {
      // Invalid JSON line, skip
      continue;
    }
  }

  return entries;
}

/**
 * セッションログディレクトリからセッション一覧を取得
 * @param projectPath - オプション。プロジェクトパス（エンコード済みまたは元のパス）
 */
export async function listSessions(projectPath?: string): Promise<SessionInfo[]> {
  const projectsDir = getClaudeProjectsDir();
  const sessions: SessionInfo[] = [];

  try {
    // プロジェクトディレクトリを取得
    let projectDirs: string[];

    if (projectPath) {
      // 特定のプロジェクトのみ
      const encoded = projectPath.startsWith("-")
        ? projectPath
        : encodeProjectPath(projectPath);
      projectDirs = [encoded];
    } else {
      // 全プロジェクト
      const entries = await readdir(projectsDir);
      projectDirs = entries;
    }

    for (const projectDir of projectDirs) {
      const projectFullPath = join(projectsDir, projectDir);

      try {
        const projectStat = await stat(projectFullPath);
        if (!projectStat.isDirectory()) {
          continue;
        }

        const files = await readdir(projectFullPath);
        for (const file of files) {
          if (file.endsWith(".jsonl")) {
            const sessionPath = join(projectFullPath, file);
            const fileStat = await stat(sessionPath);

            sessions.push({
              id: basename(file, ".jsonl"),
              project: projectDir,
              path: sessionPath,
              timestamp: fileStat.mtime.toISOString(),
            });
          }
        }
      } catch {
        // プロジェクトディレクトリが存在しない場合はスキップ
        continue;
      }
    }
  } catch {
    // projectsディレクトリが存在しない場合は空配列を返す
    return [];
  }

  // タイムスタンプで降順ソート（新しい順）
  return sessions.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * 日付でセッションをフィルタリング
 * @param sessions - セッション一覧
 * @param sinceDate - この日付以降のセッションを取得（YYYY-MM-DD形式）
 */
export function filterSessionsByDate(
  sessions: SessionInfo[],
  sinceDate: string
): SessionInfo[] {
  const since = new Date(sinceDate).getTime();
  return sessions.filter((session) => {
    if (!session.timestamp) return false;
    return new Date(session.timestamp).getTime() >= since;
  });
}

/**
 * プロジェクトでセッションをフィルタリング
 * @param sessions - セッション一覧
 * @param projectPath - プロジェクトパス（エンコード済みまたは元のパス）
 */
export function filterSessionsByProject(
  sessions: SessionInfo[],
  projectPath: string
): SessionInfo[] {
  const encoded = projectPath.startsWith("-")
    ? projectPath
    : encodeProjectPath(projectPath);
  return sessions.filter((session) => session.project === encoded);
}

/**
 * セッションIDからセッションファイルパスを取得
 */
export function getSessionPath(sessionId: string, projectPath: string): string {
  const encoded = projectPath.startsWith("-")
    ? projectPath
    : encodeProjectPath(projectPath);
  return join(getClaudeProjectsDir(), encoded, `${sessionId}.jsonl`);
}
