import { Command } from "commander";
import { addPattern } from "../../core/catalog/store.js";
import { validatePatternInput } from "../../core/catalog/validator.js";
import { readYaml } from "../../utils/fs.js";
import { success, error, info } from "../../utils/logger.js";
import type { PatternInput } from "../../types/index.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

interface AddOptions {
  file?: string;
  interactive?: boolean;
}

/**
 * YAMLファイルからパターンを追加
 * テスト用にエクスポート
 */
export async function addFromFileAction(filePath: string): Promise<void> {
  const data = await readYaml<PatternInput>(filePath);

  if (!data) {
    error(t("messages.add.fileNotFound", { path: filePath }));
    return;
  }

  const validation = validatePatternInput(data);
  if (!validation.valid) {
    error(t("messages.add.validationError", { errors: validation.errors.join("\n  - ") }));
    return;
  }

  await addPattern(data);
  success(t("messages.add.added", { name: data.name }));
}

/**
 * 対話モードでパターンを追加
 * createコマンドからも利用されるためエクスポート
 */
export async function addInteractiveAction(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    info(t("messages.add.interactive"));

    const name = await question(t("messages.add.promptName"));
    const typeStr = await question(t("messages.add.promptType"));
    const context = await question(t("messages.add.promptContext"));
    const solution = await question(t("messages.add.promptSolution"));

    const input: PatternInput = {
      name,
      type: typeStr as PatternInput["type"],
      context,
      solution,
    };

    const validation = validatePatternInput(input);
    if (!validation.valid) {
      error(t("messages.add.validationError", { errors: validation.errors.join("\n  - ") }));
      return;
    }

    await addPattern(input);
    success(t("messages.add.added", { name }));
  } finally {
    rl.close();
  }
}

/**
 * パターン手動追加コマンド
 */
export const addCommand = new Command("add")
  .description(t("cli.commands.add.description"))
  .option("-f, --file <yaml>", t("cli.commands.add.options.file"))
  .option("-i, --interactive", t("cli.commands.add.options.interactive"))
  .action(async (options: AddOptions) => {
    if (options.file) {
      await addFromFileAction(options.file);
    } else {
      await addInteractiveAction();
    }
  });
