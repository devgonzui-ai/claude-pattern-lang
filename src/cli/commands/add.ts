import { Command } from "commander";
import { addPattern } from "../../core/catalog/store.js";
import { validatePatternInput } from "../../core/catalog/validator.js";
import { readYaml } from "../../utils/fs.js";
import { success, error, info } from "../../utils/logger.js";
import type { PatternInput } from "../../types/index.js";
import * as readline from "node:readline";

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
    error(`ファイル "${filePath}" を読み込めませんでした。`);
    return;
  }

  const validation = validatePatternInput(data);
  if (!validation.valid) {
    error(`バリデーションエラー:\n  - ${validation.errors.join("\n  - ")}`);
    return;
  }

  await addPattern(data);
  success(`パターン "${data.name}" を追加しました。`);
}

/**
 * 対話モードでパターンを追加
 */
async function addInteractiveAction(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    info("パターンを対話形式で追加します。");

    const name = await question("パターン名: ");
    const typeStr = await question("タイプ (prompt/solution/code): ");
    const context = await question("コンテキスト: ");
    const solution = await question("ソリューション: ");

    const input: PatternInput = {
      name,
      type: typeStr as PatternInput["type"],
      context,
      solution,
    };

    const validation = validatePatternInput(input);
    if (!validation.valid) {
      error(`バリデーションエラー:\n  - ${validation.errors.join("\n  - ")}`);
      return;
    }

    await addPattern(input);
    success(`パターン "${name}" を追加しました。`);
  } finally {
    rl.close();
  }
}

/**
 * パターン手動追加コマンド
 */
export const addCommand = new Command("add")
  .description("パターンを手動で追加")
  .option("-f, --file <yaml>", "YAMLファイルから追加")
  .option("-i, --interactive", "対話モード（デフォルト）")
  .action(async (options: AddOptions) => {
    if (options.file) {
      await addFromFileAction(options.file);
    } else {
      await addInteractiveAction();
    }
  });
