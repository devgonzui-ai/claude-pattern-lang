import { Command } from "commander";
import yaml from "js-yaml";
import { getPatternByIdentifier, getPattern, AmbiguousIdentifierError } from "../../core/catalog/store.js";
import { error, info } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";

interface ShowOptions {
  name?: boolean;
}

/**
 * showコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function showAction(identifier: string, options: ShowOptions): Promise<void> {
  try {
    const pattern = options.name
      ? await getPattern(identifier)  // --nameオプション時は名前のみで検索
      : await getPatternByIdentifier(identifier);  // デフォルトはID→名前の優先順位

    if (!pattern) {
      error(t("messages.show.notFound", { identifier }));
      return;
    }

    // YAML形式で出力
    console.log(yaml.dump(pattern, { lineWidth: -1 }));
  } catch (err) {
    if (err instanceof AmbiguousIdentifierError) {
      error(t("messages.show.ambiguousId", { identifier: err.identifier }));
      for (const match of err.matches) {
        info(t("messages.common.ambiguousIdPrefix", { shortId: match.id.substring(0, 8), name: match.name }));
      }
      return;
    }
    throw err;
  }
}

/**
 * パターン詳細表示コマンド
 */
export const showCommand = new Command("show")
  .description(t("cli.commands.show.description"))
  .argument("<identifier>", t("cli.commands.show.argument"))
  .option("--name", t("cli.commands.show.options.name"))
  .action(showAction);
