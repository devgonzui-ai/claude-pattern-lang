import { Command } from "commander";
import { loadCatalog, saveCatalog } from "../../core/catalog/store.js";
import {
  collectSessionsForScan,
  scanPatternUsage,
} from "../../core/analyzer/usage-scanner.js";
import { info, success, warn, error, stringifyError } from "../../utils/logger.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

interface PruneOptions {
  project?: string;
  all?: boolean;
  since?: string;
  minUses?: string;
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
 * pruneコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function pruneAction(options: PruneOptions): Promise<void> {
  try {
    const minUses = options.minUses !== undefined ? Number(options.minUses) : 1;
    if (!Number.isInteger(minUses) || minUses < 1) {
      error(t("messages.prune.invalidMinUses"));
      return;
    }

    // パターンカタログを読み込む
    const catalog = await loadCatalog();

    if (catalog.patterns.length === 0) {
      warn(t("messages.prune.emptyCatalog"));
      return;
    }

    // 走査対象のセッションを収集
    const sessions = await collectSessionsForScan(options);

    if (sessions.length === 0) {
      warn(t("messages.prune.noSessions"));
      return;
    }

    info(t("messages.prune.scanning", { sessions: sessions.length, patterns: catalog.patterns.length }));

    // 使用状況を走査して削除候補を抽出
    const usages = await scanPatternUsage(catalog.patterns, sessions);
    const pruneTargets = usages.filter((u) => u.useCount < minUses);

    if (pruneTargets.length === 0) {
      success(t("messages.prune.nothingToPrune", { minUses }));
      return;
    }

    // 削除候補の表示
    info(t("messages.prune.candidates", { count: pruneTargets.length, minUses }));
    for (const usage of pruneTargets) {
      info(t("messages.prune.candidateItem", {
        shortId: usage.pattern.id.slice(0, 8),
        name: usage.pattern.name,
        uses: usage.useCount,
      }));
    }

    // dry-runの場合
    if (options.dryRun) {
      info(t("messages.prune.dryRun"));
      return;
    }

    // 確認
    if (!options.force) {
      const shouldPrune = await confirm(
        t("messages.prune.confirm", { count: pruneTargets.length })
      );
      if (!shouldPrune) {
        info(t("messages.prune.cancelled"));
        return;
      }
    }

    // カタログから削除
    const pruneIds = new Set(pruneTargets.map((u) => u.pattern.id));
    catalog.patterns = catalog.patterns.filter((p) => !pruneIds.has(p.id));
    await saveCatalog(catalog);

    success(t("messages.prune.pruned", { count: pruneTargets.length }));

    // sync/export済みファイルの再生成を案内
    info(t("messages.prune.resyncHint"));
  } catch (err) {
    error(t("messages.prune.error", { error: stringifyError(err) }));
  }
}

/**
 * 未使用パターン整理コマンド
 */
export const pruneCommand = new Command("prune")
  .description(t("cli.commands.prune.description"))
  .option("-p, --project <path>", t("cli.commands.prune.options.project"))
  .option("--all", t("cli.commands.prune.options.all"))
  .option("--since <date>", t("cli.commands.prune.options.since"))
  .option("--min-uses <n>", t("cli.commands.prune.options.minUses"))
  .option("--dry-run", t("cli.commands.prune.options.dryRun"))
  .option("--force", t("cli.commands.prune.options.force"))
  .action(pruneAction);
