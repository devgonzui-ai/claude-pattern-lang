import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadCatalog, getPatternByIdentifier, AmbiguousIdentifierError } from "../../core/catalog/store.js";
import type { Pattern } from "../../types/index.js";
import { parseClaudeMd, writeClaudeMd } from "../../core/sync/claude-md.js";
import { generatePatternFileContent, generatePatternReference } from "../../core/sync/merger.js";
import { fileExists, writeTextFile } from "../../utils/fs.js";
import { info, success, warn, error, stringifyError } from "../../utils/logger.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

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
 * patterns.mdのパスを取得
 */
function getPatternsFilePath(options: SyncOptions): string {
  if (options.global) {
    return join(homedir(), ".claude-patterns", "patterns.md");
  }
  if (options.project) {
    return join(options.project, ".claude", "patterns.md");
  }
  return join(process.cwd(), ".claude", "patterns.md");
}

/**
 * CLAUDE.mdに記載する@参照パスを取得
 */
function getPatternReferencePath(options: SyncOptions): string {
  if (options.global) {
    return "~/.claude-patterns/patterns.md";
  }
  return ".claude/patterns.md";
}

/**
 * syncコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function syncAction(ids: string[], options: SyncOptions): Promise<void> {
  try {
    // パターンカタログを読み込む
    const catalog = await loadCatalog();

    if (catalog.patterns.length === 0) {
      warn(t("messages.sync.emptyCatalog"));
      return;
    }

    // 同期対象のパターンを決定
    let patternsToSync: Pattern[];
    if (ids.length > 0) {
      // 指定されたIDのパターンのみ同期
      patternsToSync = [];
      for (const id of ids) {
        try {
          const pattern = await getPatternByIdentifier(id);
          if (!pattern) {
            error(t("messages.sync.patternNotFound", { id }));
            return;
          }
          patternsToSync.push(pattern);
        } catch (err) {
          if (err instanceof AmbiguousIdentifierError) {
            error(t("messages.sync.ambiguousId", { identifier: err.identifier }));
            for (const match of err.matches) {
              info(t("messages.common.ambiguousIdPrefix", { shortId: match.id.substring(0, 8), name: match.name }));
            }
            return;
          }
          throw err;
        }
      }
      info(t("messages.sync.syncingPatterns", { count: patternsToSync.length }));
    } else {
      // 全パターン同期
      patternsToSync = catalog.patterns;
    }

    // パスを決定
    const claudeMdPath = getClaudeMdPath(options);
    const patternsFilePath = getPatternsFilePath(options);
    const referencePath = getPatternReferencePath(options);
    const claudeMdExists = await fileExists(claudeMdPath);

    // 既存のCLAUDE.mdを読み込む
    const content = await parseClaudeMd(claudeMdPath);

    // patterns.mdのコンテンツを生成
    const patternFileContent = generatePatternFileContent(patternsToSync);

    // CLAUDE.md用の@参照セクションを生成
    const referenceSection = generatePatternReference(referencePath);

    // 新しい内容を構築
    const newContent = {
      beforePatterns: content.beforePatterns || "",
      patternsSection: referenceSection,
      afterPatterns: content.afterPatterns || "",
    };

    // diff表示
    info(t("messages.sync.changeHeader"));
    info(`--- ${patternsFilePath} ---`);
    console.log(patternFileContent);
    info(`--- ${claudeMdPath} ---`);
    console.log(referenceSection);
    info("================");

    // dry-runの場合
    if (options.dryRun) {
      info(t("messages.sync.dryRun"));
      return;
    }

    // ファイルが存在しない場合は確認
    if (!claudeMdExists && !options.force) {
      const shouldCreate = await confirm(t("messages.sync.createConfirm", { path: claudeMdPath }));
      if (!shouldCreate) {
        info(t("messages.sync.cancelled"));
        return;
      }
    }

    // 確認
    if (!options.force) {
      const shouldSave = await confirm(t("messages.sync.saveConfirm"));
      if (!shouldSave) {
        info(t("messages.sync.cancelled"));
        return;
      }
    }

    // patterns.mdを書き込み
    await writeTextFile(patternsFilePath, patternFileContent);
    success(t("messages.sync.synced", { path: patternsFilePath }));

    // CLAUDE.mdに@参照を書き込み
    await writeClaudeMd(claudeMdPath, newContent);
    success(t("messages.sync.synced", { path: claudeMdPath }));

    // 再起動の案内を表示
    info(t("messages.sync.restartHint"));
  } catch (err) {
    error(t("messages.sync.error", { error: stringifyError(err) }));
  }
}

/**
 * CLAUDE.md同期コマンド
 */
export const syncCommand = new Command("sync")
  .description(t("cli.commands.sync.description"))
  .argument("[ids...]", t("cli.commands.sync.argument"))
  .option("-p, --project <path>", t("cli.commands.sync.options.project"))
  .option("--global", t("cli.commands.sync.options.global"))
  .option("--dry-run", t("cli.commands.sync.options.dryRun"))
  .option("--force", t("cli.commands.sync.options.force"))
  .action(syncAction);
