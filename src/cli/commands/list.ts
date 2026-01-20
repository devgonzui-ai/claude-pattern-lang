import { Command } from "commander";

/**
 * パターン一覧表示コマンド
 */
export const listCommand = new Command("list")
  .description("保存済みパターンの一覧を表示")
  .option("-t, --type <type>", "prompt | solution | code でフィルタ")
  .option("-s, --search <keyword>", "キーワード検索")
  .option("--json", "JSON形式で出力")
  .action(async (_options) => {
    // TODO: 実装
    console.log("cpl list: 未実装");
  });
