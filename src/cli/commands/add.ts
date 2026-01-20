import { Command } from "commander";

/**
 * パターン手動追加コマンド
 */
export const addCommand = new Command("add")
  .description("パターンを手動で追加")
  .option("-f, --file <yaml>", "YAMLファイルから追加")
  .option("-i, --interactive", "対話モード（デフォルト）")
  .action(async (_options) => {
    // TODO: 実装
    console.log("cpl add: 未実装");
  });
