import { Command } from "commander";
import { loadCatalog } from "../../core/catalog/store.js";
import { filterByType, searchByKeyword } from "../../core/catalog/search.js";
import { table, info } from "../../utils/logger.js";
import type { Pattern, PatternType } from "../../types/index.js";
import { t } from "../../i18n/index.js";

interface ListOptions {
  type?: PatternType;
  search?: string;
  json?: boolean;
}

/**
 * パターンを表示用のレコードに変換
 */
function formatPatternForTable(pattern: Pattern): Record<string, string> {
  // IDは短く表示（最初の8文字）
  const shortId = pattern.id.slice(0, 8);

  return {
    ID: shortId,
    Name: pattern.name,
    Type: pattern.type,
    Context: pattern.context.substring(0, 40) + (pattern.context.length > 40 ? "..." : ""),
  };
}

/**
 * パターン一覧表示コマンド
 */
export const listCommand = new Command("list")
  .description(t("cli.commands.list.description"))
  .option("-t, --type <type>", t("cli.commands.list.options.type"))
  .option("-s, --search <keyword>", t("cli.commands.list.options.search"))
  .option("--json", t("cli.commands.list.options.json"))
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
      info(t("messages.list.noPatterns"));
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
