import { Command } from "commander";
import { loadCatalog, saveCatalog } from "../../core/catalog/store.js";
import {
  collectSessionsForScan,
  scanPatternUsage,
  type PatternUsage,
} from "../../core/analyzer/usage-scanner.js";
import { table, info, success, warn, error, stringifyError } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";

interface ScoreOptions {
  project?: string;
  all?: boolean;
  since?: string;
  json?: boolean;
  save?: boolean;
}

/**
 * 使用状況を表示用のレコードに変換
 */
function formatUsageForTable(usage: PatternUsage): Record<string, string> {
  return {
    ID: usage.pattern.id.slice(0, 8),
    Name: usage.pattern.name,
    Type: usage.pattern.type,
    Uses: String(usage.useCount),
    Sessions: String(usage.sessionCount),
    "Last Used": usage.lastUsedAt ? usage.lastUsedAt.slice(0, 10) : "-",
  };
}

/**
 * scoreコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function scoreAction(options: ScoreOptions): Promise<void> {
  try {
    // パターンカタログを読み込む
    const catalog = await loadCatalog();

    if (catalog.patterns.length === 0) {
      warn(t("messages.score.emptyCatalog"));
      return;
    }

    // 走査対象のセッションを収集
    const sessions = await collectSessionsForScan(options);

    if (sessions.length === 0) {
      warn(t("messages.score.noSessions"));
      return;
    }

    info(t("messages.score.scanning", { sessions: sessions.length, patterns: catalog.patterns.length }));

    // 使用状況を走査
    const usages = await scanPatternUsage(catalog.patterns, sessions);

    // JSON出力
    if (options.json) {
      console.log(
        JSON.stringify(
          usages.map((u) => ({
            id: u.pattern.id,
            name: u.pattern.name,
            type: u.pattern.type,
            use_count: u.useCount,
            session_count: u.sessionCount,
            last_used_at: u.lastUsedAt ?? null,
          })),
          null,
          2
        )
      );
    } else {
      // テーブル出力
      table(usages.map(formatUsageForTable));

      // サマリー
      const unusedCount = usages.filter((u) => u.useCount === 0).length;
      info(t("messages.score.summary", { total: usages.length, unused: unusedCount }));
      if (unusedCount > 0) {
        info(t("messages.score.pruneHint"));
      }
    }

    // --saveの場合はusage_countをカタログに永続化
    if (options.save) {
      const countById = new Map(usages.map((u) => [u.pattern.id, u.useCount]));
      for (const pattern of catalog.patterns) {
        pattern.usage_count = countById.get(pattern.id) ?? 0;
      }
      await saveCatalog(catalog);
      success(t("messages.score.saved"));
    }
  } catch (err) {
    error(t("messages.score.error", { error: stringifyError(err) }));
  }
}

/**
 * パターン使用状況スコアコマンド
 */
export const scoreCommand = new Command("score")
  .description(t("cli.commands.score.description"))
  .option("-p, --project <path>", t("cli.commands.score.options.project"))
  .option("--all", t("cli.commands.score.options.all"))
  .option("--since <date>", t("cli.commands.score.options.since"))
  .option("--json", t("cli.commands.score.options.json"))
  .option("--save", t("cli.commands.score.options.save"))
  .action(scoreAction);
