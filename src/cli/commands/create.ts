import { Command } from "commander";
import { addInteractiveAction } from "./add.js";
import { t } from "../../i18n/index.js";

/**
 * パターン作成コマンド（add -i のエイリアス）
 */
export const createCommand = new Command("create")
  .description(t("cli.commands.create.description"))
  .action(addInteractiveAction);
