import { Command } from "commander";
import { loadCatalog, saveCatalog, addPattern } from "../../core/catalog/store.js";
import { parseShareContent } from "../../core/catalog/share.js";
import { fileExists, readTextFile } from "../../utils/fs.js";
import { info, success, warn, error, stringifyError } from "../../utils/logger.js";
import type { PatternInput } from "../../types/index.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

interface ImportOptions {
  overwrite?: boolean;
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
 * ソースがURLかどうかを判定する
 */
function isUrl(source: string): boolean {
  return source.startsWith("http://") || source.startsWith("https://");
}

/**
 * ソース（ファイルパスまたはURL）からコンテンツを取得する
 */
export async function fetchShareContent(source: string): Promise<string> {
  if (isUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  if (!(await fileExists(source))) {
    throw new Error(t("messages.import.sourceNotFound", { source }));
  }
  return readTextFile(source);
}

/**
 * importコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function importAction(
  source: string,
  options: ImportOptions
): Promise<void> {
  try {
    // ソースからコンテンツを取得
    info(t("messages.import.fetching", { source }));
    let content: string;
    try {
      content = await fetchShareContent(source);
    } catch (err) {
      error(t("messages.import.fetchError", { source, error: stringifyError(err) }));
      return;
    }

    // パース
    let patterns: PatternInput[];
    let invalidCount: number;
    try {
      const result = parseShareContent(content);
      patterns = result.patterns;
      invalidCount = result.invalidCount;
    } catch (err) {
      error(t("messages.import.parseError", { error: stringifyError(err) }));
      return;
    }

    if (invalidCount > 0) {
      warn(t("messages.import.invalidSkipped", { count: invalidCount }));
    }

    if (patterns.length === 0) {
      warn(t("messages.import.noPatterns"));
      return;
    }

    // 既存パターンとの名前重複を分類
    const catalog = await loadCatalog();
    const existingNames = new Map(
      catalog.patterns.map((p) => [p.name.toLowerCase(), p])
    );

    const newPatterns: PatternInput[] = [];
    const duplicates: PatternInput[] = [];
    for (const pattern of patterns) {
      if (existingNames.has(pattern.name.toLowerCase())) {
        duplicates.push(pattern);
      } else {
        newPatterns.push(pattern);
      }
    }

    // 取り込み内容の表示
    info(t("messages.import.summary", {
      total: patterns.length,
      new: newPatterns.length,
      duplicates: duplicates.length,
    }));
    for (const pattern of newPatterns) {
      info(t("messages.import.newItem", { name: pattern.name, type: pattern.type }));
    }
    for (const pattern of duplicates) {
      info(
        options.overwrite
          ? t("messages.import.overwriteItem", { name: pattern.name })
          : t("messages.import.skipItem", { name: pattern.name })
      );
    }

    const importCount =
      newPatterns.length + (options.overwrite ? duplicates.length : 0);

    if (importCount === 0) {
      warn(t("messages.import.nothingToImport"));
      return;
    }

    // dry-runの場合
    if (options.dryRun) {
      info(t("messages.import.dryRun"));
      return;
    }

    // 確認
    if (!options.force) {
      const shouldImport = await confirm(
        t("messages.import.confirm", { count: importCount })
      );
      if (!shouldImport) {
        info(t("messages.import.cancelled"));
        return;
      }
    }

    // 新規パターンを追加
    for (const pattern of newPatterns) {
      await addPattern(pattern);
    }

    // --overwrite時は同名パターンの内容を更新
    if (options.overwrite && duplicates.length > 0) {
      const latest = await loadCatalog();
      const now = new Date().toISOString();
      for (const pattern of duplicates) {
        const existing = latest.patterns.find(
          (p) => p.name.toLowerCase() === pattern.name.toLowerCase()
        );
        if (!existing) {
          continue;
        }
        existing.type = pattern.type;
        existing.context = pattern.context;
        existing.solution = pattern.solution;
        existing.problem = pattern.problem;
        existing.example = pattern.example;
        existing.example_prompt = pattern.example_prompt;
        existing.related = pattern.related;
        existing.tags = pattern.tags;
        existing.updated_at = now;
      }
      await saveCatalog(latest);
    }

    success(t("messages.import.imported", { count: importCount }));
    info(t("messages.import.resyncHint"));
  } catch (err) {
    error(t("messages.import.error", { error: stringifyError(err) }));
  }
}

/**
 * パターンインポートコマンド
 */
export const importCommand = new Command("import")
  .description(t("cli.commands.import.description"))
  .argument("<source>", t("cli.commands.import.argument"))
  .option("--overwrite", t("cli.commands.import.options.overwrite"))
  .option("--dry-run", t("cli.commands.import.options.dryRun"))
  .option("--force", t("cli.commands.import.options.force"))
  .action(importAction);
