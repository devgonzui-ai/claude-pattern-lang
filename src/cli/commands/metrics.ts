import { Command } from "commander";
import { MetricsStorage } from "../../llm/metrics/storage.js";
import { displayMetricsHistory, displayStatistics } from "../../utils/formatters.js";
import { info, success, error, stringifyError } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";

interface MetricsOptions {
  clear?: boolean;
  stats?: boolean;
  days?: number;
}

/**
 * メトリクス管理コマンド
 */
export const metricsCommand = new Command("metrics")
  .description(t("cli.commands.metrics.description"))
  .option("--clear", t("cli.commands.metrics.options.clear"))
  .option("--stats", t("cli.commands.metrics.options.stats"))
  .option("--days <n>", t("cli.commands.metrics.options.days"), (val) => parseInt(val, 10), 7)
  .action(async (options: MetricsOptions) => {
    try {
      const storage = new MetricsStorage();

      // クリアオプション
      if (options.clear) {
        await storage.clear();
        success(t("messages.metrics.cleared"));
        return;
      }

      // 統計オプションのみ
      if (options.stats) {
        const stats = await storage.getStatistics(options.days ?? 7);
        displayStatistics(stats, options.days ?? 7);
        return;
      }

      // デフォルト: 履歴と統計を表示
      const commands = await storage.getRecentCommands(20);
      displayMetricsHistory(commands);

      const stats = await storage.getStatistics(options.days ?? 7);
      displayStatistics(stats, options.days ?? 7);

      // ヒント
      info(`\n${t("messages.metrics.hint")}`);
      info(t("messages.metrics.hintClear"));
      info(t("messages.metrics.hintStats"));
      info(t("messages.metrics.hintDays"));
    } catch (err) {
      error(t("messages.metrics.error", { error: stringifyError(err) }));
    }
  });
