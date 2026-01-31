import { Command } from "commander";
import {
  ensureDir,
  fileExists,
  writeYaml,
  getPatternsDir,
  getConfigPath,
  getCatalogPath,
} from "../../utils/fs.js";
import { info, success, warn, error, stringifyError } from "../../utils/logger.js";
import type { Config, PatternCatalog, LLMProvider, LLMConfig } from "../../types/index.js";
import { t } from "../../i18n/index.js";

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
 * 空のパターンカタログ
 */
const emptyCatalog: PatternCatalog = {
  patterns: [],
};

/**
 * デフォルトのLLM設定を取得
 */
function getDefaultLLMConfig(): LLMConfig {
  return {
    provider: "anthropic",
    model: providerDefaults.anthropic.model,
    api_key_env: providerDefaults.anthropic.api_key_env,
  };
}

/**
 * インタラクティブにLLM設定を取得
 */
async function promptLLMConfig(): Promise<LLMConfig> {
  // 動的インポートでinquirerを読み込む
  const { select, input } = await import("@inquirer/prompts");

  // プロバイダー選択
  const provider = await select<LLMProvider>({
    message: t("messages.config.selectProvider"),
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
    return {
      provider,
      model: "claude-code",
      api_key_env: "",
    };
  }

  // モデル入力
  const model = await input({
    message: t("messages.config.inputModel"),
    default: defaults.model,
  });

  // APIキー環境変数名入力（Ollamaは任意）
  let api_key_env = "";
  if (provider !== "ollama") {
    api_key_env = await input({
      message: t("messages.config.inputApiKeyEnv"),
      default: defaults.api_key_env,
    });
  }

  // base_url入力（OllamaとOpenAIのみ）
  let base_url: string | undefined;
  if (provider === "ollama") {
    base_url = await input({
      message: t("messages.config.inputOllamaHost"),
      default: defaults.base_url || "http://localhost:11434",
    });
  }

  return {
    provider,
    model,
    api_key_env,
    ...(base_url && { base_url }),
  };
}

/**
 * initコマンドのオプション
 */
interface InitOptions {
  default?: boolean;
}

/**
 * initコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function initAction(options: InitOptions = {}): Promise<void> {
  try {
    const patternsDir = getPatternsDir();
    const configPath = getConfigPath();
    const catalogPath = getCatalogPath();

    // 既存の設定があるかチェック
    if (await fileExists(configPath)) {
      warn(t("messages.init.configExists"));
      return;
    }

    // LLM設定を取得
    let llmConfig: LLMConfig;
    if (options.default) {
      // デフォルト値を使用
      llmConfig = getDefaultLLMConfig();
      info(t("messages.init.usingDefault"));
    } else {
      // インタラクティブにLLM設定を取得
      info(t("messages.init.configuringLlm"));
      llmConfig = await promptLLMConfig();
    }

    const config: Config = {
      version: 1,
      language: "en",
      llm: llmConfig,
      analysis: {
        auto_analyze: false,
        min_session_length: 5,
        exclude_patterns: [],
      },
      sync: {
        auto_sync: false,
        target_projects: [],
      },
      metrics: {
        enabled: false,
        auto_save: true,
        retention_days: 30,
        output_level: "normal",
        track_tokens: true,
        track_performance: true,
      },
    };

    // ディレクトリ作成
    info(t("messages.init.creatingDir", { path: patternsDir }));
    await ensureDir(patternsDir);

    // 設定ファイル作成
    info(t("messages.init.creatingConfig", { path: configPath }));
    await writeYaml(configPath, config);

    // カタログファイル作成（存在しない場合のみ）
    if (!(await fileExists(catalogPath))) {
      info(t("messages.init.creatingCatalog", { path: catalogPath }));
      await writeYaml(catalogPath, emptyCatalog);
    }

    success(t("messages.init.completed"));
    info("");
    info(t("messages.init.nextSteps"));
    if (llmConfig.api_key_env) {
      info(t("messages.init.step1ApiKey", { envVar: llmConfig.api_key_env }));
    } else {
      info(t("messages.init.step1Ollama"));
    }
    info(t("messages.init.step2Analyze"));
    info(t("messages.init.step3Sync"));
    info("");
    info(t("messages.init.hookInstructions"));
    info(t("messages.init.hookStep1"));
    info(t("messages.init.hookStep2"));
  } catch (err) {
    error(t("messages.init.error", { error: stringifyError(err) }));
  }
}

/**
 * 初期化コマンド
 * - ~/.claude-patterns/ ディレクトリ作成
 * - 初期設定ファイル生成
 * - Claude Codeフック設定を ~/.claude/settings.json に追加
 */
export const initCommand = new Command("init")
  .description(t("cli.commands.init.description"))
  .option("--default", t("cli.commands.init.options.default"))
  .action(initAction);
