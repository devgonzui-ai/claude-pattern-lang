import { Command } from "commander";
import { MetricsStorage } from "../../llm/metrics/storage.js";
import { displayMetricsHistory, displayStatistics } from "../../utils/formatters.js";
import { info, success, error } from "../../utils/logger.js";

interface MetricsOptions {
  clear?: boolean;
  stats?: boolean;
  days?: number;
}

/**
 * メトリクス管理コマンド
 */
export const metricsCommand = new Command("metrics")
  .description("メトリクスを表示・管理")
  .option("--clear", "メトリクスをクリア")
  .option("--stats", "統計のみ表示")
  .option("--days <n>", "集計日数を指定", (val) => parseInt(val, 10), 7)
  .action(async (options: MetricsOptions) => {
    try {
      const storage = new MetricsStorage();

      // クリアオプション
      if (options.clear) {
        await storage.clear();
        success("メトリクスをクリアしました。");
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
      info("\n💡 ヒント:");
      info("  --clear    メトリクスをクリア");
      info("  --stats    統計のみ表示");
      info("  --days <n> 集計日数を指定");
    } catch (err) {
      error(`エラー: ${err}`);
    }
  });
