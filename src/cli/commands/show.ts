import { Command } from "commander";
import yaml from "js-yaml";
import { getPattern } from "../../core/catalog/store.js";
import { error } from "../../utils/logger.js";

/**
 * showコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function showAction(name: string): Promise<void> {
  const pattern = await getPattern(name);

  if (!pattern) {
    error(`パターン "${name}" が見つかりません。`);
    return;
  }

  // YAML形式で出力
  console.log(yaml.dump(pattern, { lineWidth: -1 }));
}

/**
 * パターン詳細表示コマンド
 */
export const showCommand = new Command("show")
  .description("特定パターンの詳細を表示")
  .argument("<name>", "パターン名")
  .action(showAction);
