import { Command } from "commander";
import {
  fileExists,
  readYaml,
  writeYaml,
  getConfigPath,
} from "../../utils/fs.js";
import { info, success, warn, error } from "../../utils/logger.js";
import type { Config, LLMProvider, LLMConfig } from "../../types/index.js";

/**
 * プロバイダーごとのデフォルト設定
 */
const providerDefaults: Record<LLMProvider, Omit<LLMConfig, "provider">> = {
  anthropic: {
    model: "claude-sonnet-4-20250514",
    api_key_env: "ANTHROPIC_API_KEY",
  },
  openai: {
    model: "gpt-4o",
    api_key_env: "OPENAI_API_KEY",
  },
  gemini: {
    model: "gemini-2.0-flash",
    api_key_env: "GEMINI_API_KEY",
  },
  ollama: {
    model: "llama3.1",
    api_key_env: "",
    base_url: "http://localhost:11434",
  },
  deepseek: {
    model: "deepseek-chat",
    api_key_env: "DEEPSEEK_API_KEY",
  },
  zhipu: {
    model: "glm-4",
    api_key_env: "ZHIPUAI_API_KEY",
  },
  "claude-code": {
    model: "claude-code",
    api_key_env: "",
  },
};

/**
 * 現在の設定を表示
 */
async function showConfig(): Promise<void> {
  const configPath = getConfigPath();

  if (!(await fileExists(configPath))) {
    warn("設定ファイルが見つかりません。`cpl init` を実行してください。");
    return;
  }

  const config = await readYaml<Config>(configPath);

  if (!config) {
    error("設定ファイルの読み込みに失敗しました。");
    return;
  }

  info("現在のLLM設定:");
  info(`  プロバイダー: ${config.llm.provider}`);
  info(`  モデル: ${config.llm.model}`);
  if (config.llm.api_key_env) {
    info(`  APIキー環境変数: ${config.llm.api_key_env}`);
  }
  if (config.llm.base_url) {
    info(`  ベースURL: ${config.llm.base_url}`);
  }
  info("");
  info("解析設定:");
  info(`  自動解析: ${config.analysis.auto_analyze}`);
  info(`  最小セッション長: ${config.analysis.min_session_length}`);
  info("");
  info("同期設定:");
  info(`  自動同期: ${config.sync.auto_sync}`);
}

/**
 * インタラクティブにプロバイダーを変更
 */
async function changeProvider(): Promise<void> {
  const configPath = getConfigPath();

  if (!(await fileExists(configPath))) {
    warn("設定ファイルが見つかりません。`cpl init` を実行してください。");
    return;
  }

  const config = await readYaml<Config>(configPath);

  if (!config) {
    error("設定ファイルの読み込みに失敗しました。");
    return;
  }

  // 動的インポートでinquirerを読み込む
  const { select, input } = await import("@inquirer/prompts");

  // プロバイダー選択
  const provider = await select<LLMProvider>({
    message: "LLMプロバイダーを選択してください",
    default: config.llm.provider,
    choices: [
      { value: "anthropic", name: "Anthropic (Claude)" },
      { value: "openai", name: "OpenAI (GPT-4)" },
      { value: "gemini", name: "Google Gemini" },
      { value: "ollama", name: "Ollama (ローカル)" },
      { value: "deepseek", name: "DeepSeek" },
      { value: "zhipu", name: "Zhipu AI (GLM)" },
      { value: "claude-code", name: "Claude Code (APIキー不要)" },
    ],
  });

  const defaults = providerDefaults[provider];

  // claude-codeの場合は設定入力をスキップ
  if (provider === "claude-code") {
    config.llm = {
      provider,
      model: "claude-code",
      api_key_env: "",
    };
    await writeYaml(configPath, config);
    success("設定を更新しました!");
    return;
  }

  // モデル入力
  const model = await input({
    message: "モデルを入力してください",
    default: provider === config.llm.provider ? config.llm.model : defaults.model,
  });

  // APIキー環境変数名入力（Ollamaは任意）
  let api_key_env = "";
  if (provider !== "ollama") {
    api_key_env = await input({
      message: "APIキーの環境変数名を入力してください",
      default: provider === config.llm.provider ? config.llm.api_key_env : defaults.api_key_env,
    });
  }

  // base_url入力（Ollamaのみ）
  let base_url: string | undefined;
  if (provider === "ollama") {
    base_url = await input({
      message: "Ollamaホストを入力してください",
      default: config.llm.base_url || defaults.base_url || "http://localhost:11434",
    });
  }

  // 設定を更新
  config.llm = {
    provider,
    model,
    api_key_env,
    ...(base_url && { base_url }),
  };

  await writeYaml(configPath, config);
  success("設定を更新しました!");
}

/**
 * 設定値を直接変更
 * @param keyValue - "key=value" 形式の文字列
 */
async function setConfigValue(keyValue: string): Promise<void> {
  const configPath = getConfigPath();

  if (!(await fileExists(configPath))) {
    warn("設定ファイルが見つかりません。`cpl init` を実行してください。");
    return;
  }

  const match = keyValue.match(/^([^=]+)=(.*)$/);
  if (!match) {
    error("形式が不正です。'key=value' の形式で指定してください。");
    return;
  }

  const [, key, value] = match;
  const config = await readYaml<Config>(configPath);

  if (!config) {
    error("設定ファイルの読み込みに失敗しました。");
    return;
  }

  // ドット記法でネストされたキーをサポート
  const keys = key.split(".");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in target)) {
      error(`キー '${key}' が見つかりません。`);
      return;
    }
    target = target[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  if (!(lastKey in target)) {
    error(`キー '${key}' が見つかりません。`);
    return;
  }

  // 型に応じて値を変換
  const currentValue = target[lastKey];
  if (typeof currentValue === "boolean") {
    target[lastKey] = value === "true";
  } else if (typeof currentValue === "number") {
    target[lastKey] = Number(value);
  } else {
    target[lastKey] = value;
  }

  await writeYaml(configPath, config);
  success(`${key} を ${value} に設定しました。`);
}

/**
 * configコマンドのオプション
 */
interface ConfigOptions {
  provider?: boolean;
  set?: string;
}

/**
 * configコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function configAction(options: ConfigOptions): Promise<void> {
  try {
    if (options.provider) {
      await changeProvider();
    } else if (options.set) {
      await setConfigValue(options.set);
    } else {
      await showConfig();
    }
  } catch (err) {
    error(`設定操作中にエラーが発生しました: ${err}`);
  }
}

/**
 * 設定管理コマンド
 * - 設定の表示
 * - プロバイダーの変更
 * - 値の直接設定
 */
export const configCommand = new Command("config")
  .description("設定を表示・変更する")
  .option("--provider", "プロバイダーをインタラクティブに変更")
  .option("--set <key=value>", "設定値を直接変更 (例: llm.model=gpt-4o)")
  .action(configAction);
