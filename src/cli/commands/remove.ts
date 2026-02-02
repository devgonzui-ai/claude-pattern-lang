import { Command } from "commander";
import { removePatternByIdentifier, removePattern, AmbiguousIdentifierError } from "../../core/catalog/store.js";
import { success, error, info } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";

interface RemoveOptions {
  name?: boolean;
}

/**
 * removeコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function removeAction(identifier: string, options: RemoveOptions): Promise<void> {
  try {
    const removed = options.name
      ? await removePattern(identifier)  // --nameオプション時は名前のみで検索
      : await removePatternByIdentifier(identifier);  // デフォルトはID→名前の優先順位

    if (!removed) {
      error(t("messages.remove.notFound", { identifier }));
      return;
    }

    success(t("messages.remove.removed", { identifier }));
  } catch (err) {
    if (err instanceof AmbiguousIdentifierError) {
      error(t("messages.remove.ambiguousId", { identifier: err.identifier }));
      for (const match of err.matches) {
        info(t("messages.common.ambiguousIdPrefix", { shortId: match.id.substring(0, 8), name: match.name }));
      }
      return;
    }
    throw err;
  }
}

/**
 * パターン削除コマンド
 */
export const removeCommand = new Command("remove")
  .description(t("cli.commands.remove.description"))
  .argument("<identifier>", t("cli.commands.remove.argument"))
  .option("--name", t("cli.commands.remove.options.name"))
  .action(removeAction);
