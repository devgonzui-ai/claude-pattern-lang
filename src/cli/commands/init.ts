import { Command } from "commander";

/**
 * 初期化コマンド
 * - ~/.claude-patterns/ ディレクトリ作成
 * - 初期設定ファイル生成
 * - Claude Codeフック設定を ~/.claude/settings.json に追加
 */
export const initCommand = new Command("init")
  .description("ツールの初期設定を行う")
  .action(async () => {
    // TODO: 実装
    console.log("cpl init: 未実装");
  });
