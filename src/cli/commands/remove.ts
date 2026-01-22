import { Command } from "commander";
import { removePattern } from "../../core/catalog/store.js";
import { success, error } from "../../utils/logger.js";

/**
 * removeコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function removeAction(name: string): Promise<void> {
  const removed = await removePattern(name);

  if (!removed) {
    error(`パターン "${name}" が見つかりません。`);
    return;
  }

  success(`パターン "${name}" を削除しました。`);
}

/**
 * パターン削除コマンド
 */
export const removeCommand = new Command("remove")
  .description("パターンを削除")
  .argument("<name>", "パターン名")
  .action(removeAction);
