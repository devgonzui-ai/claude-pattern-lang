import { Command } from "commander";
import {
  fileExists,
  readYaml,
  writeYaml,
  getConfigPath,
} from "../../utils/fs.js";
import { info, success, error, stringifyError } from "../../utils/logger.js";
import type { Config, LLMProvider, LLMConfig } from "../../types/index.js";
import { t, initI18n } from "../../i18n/index.js";

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
    error(t("messages.config.notFound"));
    info(t("messages.config.runInitFirst"));
    return;
  }

  const config = await readYaml<Config>(configPath);

  if (!config) {
    error(t("messages.config.loadError"));
    return;
  }

  info("llm:");
  info(`  provider: ${config.llm.provider}`);
  info(`  model: ${config.llm.model}`);
  if (config.llm.api_key_env) {
    info(`  api_key_env: ${config.llm.api_key_env}`);
  }
  if (config.llm.base_url) {
    info(`  base_url: ${config.llm.base_url}`);
  }
  info("analysis:");
  info(`  auto_analyze: ${config.analysis.auto_analyze}`);
  info(`  min_session_length: ${config.analysis.min_session_length}`);
  if (config.analysis.exclude_patterns.length > 0) {
    info(`  exclude_patterns:`);
    for (const pattern of config.analysis.exclude_patterns) {
      info(`    - ${pattern}`);
    }
  }
  info("sync:");
  info(`  auto_sync: ${config.sync.auto_sync}`);
  if (config.sync.target_projects.length > 0) {
    info(`  target_projects:`);
    for (const project of config.sync.target_projects) {
      info(`    - ${project}`);
    }
  }
  info("metrics:");
  info(`  enabled: ${config.metrics.enabled}`);
  info(`  auto_save: ${config.metrics.auto_save}`);
  info(`  retention_days: ${config.metrics.retention_days}`);
  info(`  output_level: ${config.metrics.output_level}`);
  info(`  track_tokens: ${config.metrics.track_tokens}`);
  info(`  track_performance: ${config.metrics.track_performance}`);
}

/**
 * インタラクティブにプロバイダーを変更
 */
async function changeProvider(): Promise<void> {
  const configPath = getConfigPath();

  if (!(await fileExists(configPath))) {
    error(t("messages.config.notFound"));
    info(t("messages.config.runInitFirst"));
    return;
  }

  const config = await readYaml<Config>(configPath);

  if (!config) {
    error(t("messages.config.loadError"));
    return;
  }

  // 動的インポートでinquirerを読み込む
  const { select, input } = await import("@inquirer/prompts");

  // プロバイダー選択
  const provider = await select<LLMProvider>({
    message: t("messages.config.selectProvider"),
    default: config.llm.provider,
    choices: [
      { value: "anthropic", name: t("providers.anthropic") },
      { value: "openai", name: t("providers.openai") },
      { value: "gemini", name: t("providers.gemini") },
      { value: "ollama", name: t("providers.ollama") },
      { value: "deepseek", name: t("providers.deepseek") },
      { value: "claude-code", name: t("providers.claudeCode") },
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
    success(t("messages.config.updated"));
    return;
  }

  // モデル入力
  const model = await input({
    message: t("messages.config.inputModel"),
    default: provider === config.llm.provider ? config.llm.model : defaults.model,
  });

  // APIキー環境変数名入力（Ollamaは任意）
  let api_key_env = "";
  if (provider !== "ollama") {
    api_key_env = await input({
      message: t("messages.config.inputApiKeyEnv"),
      default: provider === config.llm.provider ? config.llm.api_key_env : defaults.api_key_env,
    });
  }

  // base_url入力（Ollamaのみ）
  let base_url: string | undefined;
  if (provider === "ollama") {
    base_url = await input({
      message: t("messages.config.inputOllamaHost"),
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
  success(t("messages.config.updated"));
}

/**
 * 設定値を直接変更
 * @param keyValue - "key=value" 形式の文字列
 */
async function setConfigValue(keyValue: string): Promise<void> {
  const configPath = getConfigPath();

  if (!(await fileExists(configPath))) {
    error(t("messages.config.notFound"));
    info(t("messages.config.runInitFirst"));
    return;
  }

  const match = keyValue.match(/^([^=]+)=(.*)$/);
  if (!match) {
    error(t("messages.config.invalidFormat"));
    return;
  }

  const [, key, value] = match;
  const config = await readYaml<Config>(configPath);

  if (!config) {
    error(t("messages.config.loadError"));
    return;
  }

  // ドット記法でネストされたキーをサポート
  const keys = key.split(".");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in target)) {
      error(t("messages.config.keyNotFound", { key }));
      return;
    }
    target = target[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  if (!(lastKey in target)) {
    error(t("messages.config.keyNotFound", { key }));
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

  // 言語が変更された場合はi18nを再初期化
  if (key === "language") {
    await initI18n();
  }

  success(t("messages.config.setValue", { key, value }));
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
    error(t("messages.config.error", { error: stringifyError(err) }));
  }
}

/**
 * 設定管理コマンド
 * - 設定の表示
 * - プロバイダーの変更
 * - 値の直接設定
 */
export const configCommand = new Command("config")
  .description(t("cli.commands.config.description"))
  .option("--provider", t("cli.commands.config.options.provider"))
  .option("--set <key=value>", t("cli.commands.config.options.set"))
  .action(configAction);
