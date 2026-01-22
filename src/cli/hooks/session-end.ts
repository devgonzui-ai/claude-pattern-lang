import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import yaml from "js-yaml";
import type { AnalysisQueue, QueueItem } from "../../types/index.js";

/**
 * キューファイルのパスを取得
 */
export function getQueuePath(): string {
  return join(homedir(), ".claude-patterns", "queue.yaml");
}

/**
 * キューを読み込む（存在しない場合は空のキュー）
 */
export async function loadQueue(): Promise<AnalysisQueue> {
  try {
    const content = await readFile(getQueuePath(), "utf-8");
    if (!content.trim()) {
      return { items: [] };
    }
    return yaml.load(content) as AnalysisQueue;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { items: [] };
    }
    throw error;
  }
}

/**
 * キューを保存
 */
export async function saveQueue(queue: AnalysisQueue): Promise<void> {
  const queuePath = getQueuePath();
  await mkdir(dirname(queuePath), { recursive: true });
  const content = yaml.dump(queue, { lineWidth: -1 });
  await writeFile(queuePath, content, "utf-8");
}

/**
 * セッションをキューに追加
 */
export async function addToQueue(
  sessionId: string,
  project: string
): Promise<void> {
  const queue = await loadQueue();

  // 重複チェック
  const exists = queue.items.some((item) => item.session_id === sessionId);
  if (exists) {
    return;
  }

  const item: QueueItem = {
    session_id: sessionId,
    project,
    added_at: new Date().toISOString(),
  };

  queue.items.push(item);
  await saveQueue(queue);
}

/**
 * SessionEndフック処理
 * Claude Codeセッション終了時にセッションIDを解析キューに追加
 *
 * 環境変数:
 * - CLAUDE_SESSION_ID: セッションID
 * - CLAUDE_PROJECT_PATH: プロジェクトパス
 */
export async function handleSessionEnd(): Promise<void> {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  const projectPath = process.env.CLAUDE_PROJECT_PATH;

  if (!sessionId) {
    return;
  }

  await addToQueue(sessionId, projectPath || "");
}
