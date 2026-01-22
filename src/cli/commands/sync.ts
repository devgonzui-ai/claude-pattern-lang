import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadCatalog } from "../../core/catalog/store.js";
import { parseClaudeMd, writeClaudeMd } from "../../core/sync/claude-md.js";
import { generatePatternsSection, mergePatternsSections } from "../../core/sync/merger.js";
import { fileExists } from "../../utils/fs.js";
import { info, success, warn, error } from "../../utils/logger.js";
import * as readline from "node:readline";

interface SyncOptions {
  project?: string;
  global?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * ユーザーに確認を求める
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

/**
 * CLAUDE.mdのパスを取得
 */
function getClaudeMdPath(options: SyncOptions): string {
  if (options.global) {
    return join(homedir(), ".claude", "CLAUDE.md");
  }
  if (options.project) {
    return join(options.project, "CLAUDE.md");
  }
  return join(process.cwd(), "CLAUDE.md");
}

/**
 * syncコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function syncAction(options: SyncOptions): Promise<void> {
  try {
    // パターンカタログを読み込む
    const catalog = await loadCatalog();

    if (catalog.patterns.length === 0) {
      warn("パターンカタログが空です。先に `cpl add` または `cpl analyze` でパターンを追加してください。");
      return;
    }

    // CLAUDE.mdのパスを決定
    const claudeMdPath = getClaudeMdPath(options);
    const exists = await fileExists(claudeMdPath);

    // 既存のCLAUDE.mdを読み込む
    let content = await parseClaudeMd(claudeMdPath);

    // 新しいパターンセクションを生成
    const newPatternSection = generatePatternsSection(catalog.patterns);

    // マージ
    const mergedSection = mergePatternsSections(content.patternsSection, newPatternSection);

    // 新しい内容を構築
    const newContent = {
      beforePatterns: content.beforePatterns || "",
      patternsSection: mergedSection,
      afterPatterns: content.afterPatterns || "",
    };

    // diff表示
    info("=== 変更内容 ===");
    console.log(mergedSection);
    info("================");

    // dry-runの場合
    if (options.dryRun) {
      info("[dry-run] 変更は保存されませんでした。");
      return;
    }

    // ファイルが存在しない場合は確認
    if (!exists && !options.force) {
      const shouldCreate = await confirm(`${claudeMdPath} が存在しません。新規作成しますか?`);
      if (!shouldCreate) {
        info("同期をキャンセルしました。");
        return;
      }
    }

    // 確認
    if (!options.force) {
      const shouldSave = await confirm("変更を保存しますか?");
      if (!shouldSave) {
        info("同期をキャンセルしました。");
        return;
      }
    }

    // 書き込み
    await writeClaudeMd(claudeMdPath, newContent);
    success(`${claudeMdPath} にパターンを同期しました。`);
  } catch (err) {
    error(`エラー: ${err}`);
  }
}

/**
 * CLAUDE.md同期コマンド
 */
export const syncCommand = new Command("sync")
  .description("パターンカタログをCLAUDE.mdに反映")
  .option("-p, --project <path>", "同期先プロジェクト")
  .option("--global", "~/.claude/CLAUDE.md に同期")
  .option("--dry-run", "変更内容のみ表示")
  .option("--force", "確認なしで上書き")
  .action(syncAction);
