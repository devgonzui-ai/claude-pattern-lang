import { Command } from "commander";

/**
 * CLAUDE.md同期コマンド
 */
export const syncCommand = new Command("sync")
  .description("パターンカタログをCLAUDE.mdに反映")
  .option("-p, --project <path>", "同期先プロジェクト")
  .option("--global", "~/.claude/CLAUDE.md に同期")
  .option("--dry-run", "変更内容のみ表示")
  .option("--force", "確認なしで上書き")
  .action(async (_options) => {
    // TODO: 実装
    console.log("cpl sync: 未実装");
  });
