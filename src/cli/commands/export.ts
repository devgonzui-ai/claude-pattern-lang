import { Command } from "commander";
import { loadCatalog, getPatternByIdentifier, AmbiguousIdentifierError } from "../../core/catalog/store.js";
import type { Pattern } from "../../types/index.js";
import { getSkillsDir, buildSkillFiles } from "../../core/sync/skills.js";
import { writeTextFile } from "../../utils/fs.js";
import { info, success, warn, error, stringifyError } from "../../utils/logger.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

interface ExportOptions {
  skills?: boolean;
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
 * exportコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function exportAction(ids: string[], options: ExportOptions): Promise<void> {
  try {
    // パターンカタログを読み込む
    const catalog = await loadCatalog();

    if (catalog.patterns.length === 0) {
      warn(t("messages.export.emptyCatalog"));
      return;
    }

    // エクスポート対象のパターンを決定
    let patternsToExport: Pattern[];
    if (ids.length > 0) {
      patternsToExport = [];
      for (const id of ids) {
        try {
          const pattern = await getPatternByIdentifier(id);
          if (!pattern) {
            error(t("messages.export.patternNotFound", { id }));
            return;
          }
          patternsToExport.push(pattern);
        } catch (err) {
          if (err instanceof AmbiguousIdentifierError) {
            error(t("messages.export.ambiguousId", { identifier: err.identifier }));
            for (const match of err.matches) {
              info(t("messages.common.ambiguousIdPrefix", { shortId: match.id.substring(0, 8), name: match.name }));
            }
            return;
          }
          throw err;
        }
      }
    } else {
      // 全パターンエクスポート
      patternsToExport = catalog.patterns;
    }

    // 出力先とスキルファイルを決定
    const skillsDir = getSkillsDir(options);
    const skillFiles = buildSkillFiles(patternsToExport, skillsDir);

    info(t("messages.export.exportingPatterns", { count: skillFiles.length }));

    // 生成内容の表示
    info(t("messages.export.changeHeader"));
    for (const file of skillFiles) {
      info(`--- ${file.filePath} ---`);
      console.log(file.content);
    }
    info("================");

    // dry-runの場合
    if (options.dryRun) {
      info(t("messages.export.dryRun"));
      return;
    }

    // 確認
    if (!options.force) {
      const shouldSave = await confirm(
        t("messages.export.saveConfirm", { count: skillFiles.length, dir: skillsDir })
      );
      if (!shouldSave) {
        info(t("messages.export.cancelled"));
        return;
      }
    }

    // スキルファイルを書き込み
    for (const file of skillFiles) {
      await writeTextFile(file.filePath, file.content);
      success(t("messages.export.fileWritten", { path: file.filePath }));
    }

    success(t("messages.export.exported", { count: skillFiles.length, dir: skillsDir }));

    // 再起動の案内を表示
    info(t("messages.export.restartHint"));
  } catch (err) {
    error(t("messages.export.error", { error: stringifyError(err) }));
  }
}

/**
 * Claude Code Skillsエクスポートコマンド
 */
export const exportCommand = new Command("export")
  .description(t("cli.commands.export.description"))
  .argument("[ids...]", t("cli.commands.export.argument"))
  .option("--skills", t("cli.commands.export.options.skills"), true)
  .option("-p, --project <path>", t("cli.commands.export.options.project"))
  .option("--global", t("cli.commands.export.options.global"))
  .option("--dry-run", t("cli.commands.export.options.dryRun"))
  .option("--force", t("cli.commands.export.options.force"))
  .action(exportAction);
