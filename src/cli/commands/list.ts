import { Command } from "commander";
import { loadCatalog } from "../../core/catalog/store.js";
import { filterByType, searchByKeyword } from "../../core/catalog/search.js";
import { table, info } from "../../utils/logger.js";
import type { Pattern, PatternType } from "../../types/index.js";

interface ListOptions {
  type?: PatternType;
  search?: string;
  json?: boolean;
}

/**
 * パターンを表示用のレコードに変換
 */
function formatPatternForTable(pattern: Pattern): Record<string, string> {
  return {
    Name: pattern.name,
    Type: pattern.type,
    Context: pattern.context.substring(0, 50) + (pattern.context.length > 50 ? "..." : ""),
  };
}

/**
 * パターン一覧表示コマンド
 */
export const listCommand = new Command("list")
  .description("保存済みパターンの一覧を表示")
  .option("-t, --type <type>", "prompt | solution | code でフィルタ")
  .option("-s, --search <keyword>", "キーワード検索")
  .option("--json", "JSON形式で出力")
  .action(async (options: ListOptions) => {
    const catalog = await loadCatalog();
    let patterns = catalog.patterns;

    // タイプフィルタ
    if (options.type) {
      patterns = filterByType(patterns, options.type);
    }

    // キーワード検索
    if (options.search) {
      patterns = searchByKeyword(patterns, options.search);
    }

    // 空の場合
    if (patterns.length === 0) {
      info("パターンが見つかりませんでした。");
      return;
    }

    // JSON出力
    if (options.json) {
      console.log(JSON.stringify(patterns, null, 2));
      return;
    }

    // テーブル出力
    const tableData = patterns.map(formatPatternForTable);
    table(tableData);
  });
