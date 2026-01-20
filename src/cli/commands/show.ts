import { Command } from "commander";

/**
 * パターン詳細表示コマンド
 */
export const showCommand = new Command("show")
  .description("特定パターンの詳細を表示")
  .argument("<name>", "パターン名")
  .action(async (_name) => {
    // TODO: 実装
    console.log("cpl show: 未実装");
  });
