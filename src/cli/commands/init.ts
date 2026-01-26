import { Command } from "commander";
import {
  ensureDir,
  fileExists,
  writeYaml,
  getPatternsDir,
  getConfigPath,
  getCatalogPath,
} from "../../utils/fs.js";
import { info, success, warn, error } from "../../utils/logger.js";
import type { Config, PatternCatalog, LLMProvider, LLMConfig } from "../../types/index.js";

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
    message: "LLMプロバイダーを選択してください",
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
    return {
      provider,
      model: "claude-code",
      api_key_env: "",
    };
  }

  // モデル入力
  const model = await input({
    message: "モデルを入力してください",
    default: defaults.model,
  });

  // APIキー環境変数名入力（Ollamaは任意）
  let api_key_env = "";
  if (provider !== "ollama") {
    api_key_env = await input({
      message: "APIキーの環境変数名を入力してください",
      default: defaults.api_key_env,
    });
  }

  // base_url入力（OllamaとOpenAIのみ）
  let base_url: string | undefined;
  if (provider === "ollama") {
    base_url = await input({
      message: "Ollamaホストを入力してください",
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
      warn("設定ファイルは既に存在します。上書きする場合は手動で削除してください。");
      return;
    }

    // LLM設定を取得
    let llmConfig: LLMConfig;
    if (options.default) {
      // デフォルト値を使用
      llmConfig = getDefaultLLMConfig();
      info("デフォルト設定を使用します (Anthropic Claude)");
    } else {
      // インタラクティブにLLM設定を取得
      info("LLM設定を構成します...");
      llmConfig = await promptLLMConfig();
    }

    const config: Config = {
      version: 1,
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
    };

    // ディレクトリ作成
    info(`ディレクトリを作成中: ${patternsDir}`);
    await ensureDir(patternsDir);

    // 設定ファイル作成
    info(`設定ファイルを作成中: ${configPath}`);
    await writeYaml(configPath, config);

    // カタログファイル作成（存在しない場合のみ）
    if (!(await fileExists(catalogPath))) {
      info(`カタログファイルを作成中: ${catalogPath}`);
      await writeYaml(catalogPath, emptyCatalog);
    }

    success("初期化が完了しました!");
    info("");
    info("次のステップ:");
    if (llmConfig.api_key_env) {
      info(`  1. ${llmConfig.api_key_env} 環境変数を設定してください`);
    } else {
      info(`  1. Ollamaサーバーが起動していることを確認してください`);
    }
    info("  2. `cpl analyze` でセッションを解析してパターンを抽出");
    info("  3. `cpl sync` でCLAUDE.mdにパターンを同期");
    info("");
    info("Claude Codeフックを有効にするには:");
    info("  ~/.claude/settings.json にフック設定を追加後、");
    info("  Claude Code内で `/hooks` を実行して承認してください。");
  } catch (err) {
    error(`初期化中にエラーが発生しました: ${err}`);
  }
}

/**
 * 初期化コマンド
 * - ~/.claude-patterns/ ディレクトリ作成
 * - 初期設定ファイル生成
 * - Claude Codeフック設定を ~/.claude/settings.json に追加
 */
export const initCommand = new Command("init")
  .description("ツールの初期設定を行う")
  .option("--default", "デフォルト設定を使用 (インタラクティブ入力をスキップ)")
  .action(initAction);
