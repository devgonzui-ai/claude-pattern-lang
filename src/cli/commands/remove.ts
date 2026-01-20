import { Command } from "commander";

/**
 * パターン削除コマンド
 */
export const removeCommand = new Command("remove")
  .description("パターンを削除")
  .argument("<name>", "パターン名")
  .action(async (_name) => {
    // TODO: 実装
    console.log("cpl remove: 未実装");
  });
