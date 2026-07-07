import { join } from "node:path";
import { loadQueue, saveQueue } from "./session-end.js";
import {
  getClaudeProjectsDir,
  encodeProjectPath,
  parseSessionLog,
} from "../../core/analyzer/session-parser.js";
import { extractPatterns } from "../../core/analyzer/pattern-extractor.js";
import { loadCatalog, addPattern } from "../../core/catalog/store.js";
import {
  generatePatternFileContent,
  generatePatternReference,
} from "../../core/sync/merger.js";
import { parseClaudeMd, writeClaudeMd } from "../../core/sync/claude-md.js";
import {
  fileExists,
  readYaml,
  writeTextFile,
  getConfigPath,
} from "../../utils/fs.js";
import type { Config, QueueItem } from "../../types/index.js";

/**
 * 1回のフック実行で処理するキューアイテムの最大数
 * （Stopフックは頻繁に発火するため、1回あたりの処理量を抑える）
 */
const MAX_ITEMS_PER_RUN = 3;

/**
 * キューアイテムからセッションログのパスを解決する
 */
export function getSessionLogPath(item: QueueItem): string {
  return join(
    getClaudeProjectsDir(),
    encodeProjectPath(item.project),
    `${item.session_id}.jsonl`
  );
}

/**
 * 設定を読み込む（存在しない場合はnull）
 */
async function loadConfig(): Promise<Config | null> {
  const configPath = getConfigPath();
  if (!(await fileExists(configPath))) {
    return null;
  }
  return readYaml<Config>(configPath);
}

/**
 * キューアイテムのセッションを解析してパターンを保存する
 * @returns 保存したパターン数
 */
export async function processQueueItem(
  item: QueueItem,
  config: Config
): Promise<number> {
  const logPath = getSessionLogPath(item);

  if (!(await fileExists(logPath))) {
    return 0;
  }

  const entries = await parseSessionLog(logPath);

  // 短すぎるセッションは解析対象外
  if (entries.length < config.analysis.min_session_length) {
    return 0;
  }

  // 最新のカタログを既存パターンとして渡す（近接重複の再抽出を防ぐ）
  const catalog = await loadCatalog();
  const patterns = await extractPatterns(entries, catalog.patterns, config.llm);

  for (const pattern of patterns) {
    await addPattern(pattern);
  }

  return patterns.length;
}

/**
 * プロジェクトへ自動syncする（確認なし・出力なし）
 * `cpl sync --project <path> --force` 相当の処理
 */
export async function autoSyncProject(projectPath: string): Promise<void> {
  const catalog = await loadCatalog();
  if (catalog.patterns.length === 0) {
    return;
  }

  const claudeMdPath = join(projectPath, "CLAUDE.md");
  const patternsFilePath = join(projectPath, ".claude", "patterns.md");
  const referencePath = ".claude/patterns.md";

  const content = await parseClaudeMd(claudeMdPath);

  await writeTextFile(
    patternsFilePath,
    generatePatternFileContent(catalog.patterns)
  );

  await writeClaudeMd(claudeMdPath, {
    beforePatterns: content.beforePatterns || "",
    patternsSection: generatePatternReference(referencePath),
    afterPatterns: content.afterPatterns || "",
  });
}

/**
 * Stopフック処理
 * auto_analyze が有効な場合、解析キューに溜まったセッションを自動解析し、
 * auto_sync が有効なら抽出結果をプロジェクトのCLAUDE.mdへ自動反映する。
 *
 * フックとして実行されるため、エラーでもプロセスを異常終了させない。
 */
export async function handleStop(): Promise<void> {
  try {
    const config = await loadConfig();
    if (!config?.analysis?.auto_analyze) {
      return;
    }

    const queue = await loadQueue();
    if (queue.items.length === 0) {
      return;
    }

    // 進行中の現在セッションは解析しない
    const currentSessionId = process.env.CLAUDE_SESSION_ID;
    const pending = queue.items.filter(
      (item) => item.session_id !== currentSessionId
    );
    if (pending.length === 0) {
      return;
    }

    const batch = pending.slice(0, MAX_ITEMS_PER_RUN);
    const processedIds = new Set<string>();
    const syncTargets = new Set<string>();
    let addedCount = 0;

    for (const item of batch) {
      try {
        const added = await processQueueItem(item, config);
        addedCount += added;
        if (added > 0 && item.project) {
          syncTargets.add(item.project);
        }
      } catch (err) {
        // 解析失敗はスキップ（キューからは外して無限リトライを防ぐ）
        console.error(`cpl _hook-stop: failed to analyze ${item.session_id}: ${err}`);
      }
      processedIds.add(item.session_id);
    }

    // 処理済みアイテムをキューから削除
    const latestQueue = await loadQueue();
    latestQueue.items = latestQueue.items.filter(
      (item) => !processedIds.has(item.session_id)
    );
    await saveQueue(latestQueue);

    // 自動sync
    if (addedCount > 0 && config.sync?.auto_sync) {
      for (const projectPath of syncTargets) {
        try {
          await autoSyncProject(projectPath);
        } catch (err) {
          console.error(`cpl _hook-stop: failed to sync ${projectPath}: ${err}`);
        }
      }
    }
  } catch (err) {
    // フックはClaude Code本体の動作を妨げない
    console.error(`cpl _hook-stop: ${err}`);
  }
}
