import { Command } from "commander";

/**
 * セッション解析コマンド
 * - セッションログを解析してパターンを抽出
 */
export const analyzeCommand = new Command("analyze")
  .description("セッションログを解析してパターンを抽出")
  .option("-s, --session <id>", "特定セッションのみ解析")
  .option("-d, --since <date>", "指定日以降のセッションを解析")
  .option("-p, --project <path>", "特定プロジェクトのみ")
  .option("--dry-run", "保存せず結果のみ表示")
  .option("--auto-approve", "確認なしで保存")
  .action(async (_options) => {
    // TODO: 実装
    console.log("cpl analyze: 未実装");
  });
