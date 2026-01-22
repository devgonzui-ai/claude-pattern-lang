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
import type { Config, PatternCatalog } from "../../types/index.js";

/**
 * デフォルト設定
 */
const defaultConfig: Config = {
  version: 1,
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    api_key_env: "ANTHROPIC_API_KEY",
  },
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

/**
 * 空のパターンカタログ
 */
const emptyCatalog: PatternCatalog = {
  patterns: [],
};

/**
 * initコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function initAction(): Promise<void> {
  try {
    const patternsDir = getPatternsDir();
    const configPath = getConfigPath();
    const catalogPath = getCatalogPath();

    // 既存の設定があるかチェック
    if (await fileExists(configPath)) {
      warn("設定ファイルは既に存在します。上書きする場合は手動で削除してください。");
      return;
    }

    // ディレクトリ作成
    info(`ディレクトリを作成中: ${patternsDir}`);
    await ensureDir(patternsDir);

    // 設定ファイル作成
    info(`設定ファイルを作成中: ${configPath}`);
    await writeYaml(configPath, defaultConfig);

    // カタログファイル作成（存在しない場合のみ）
    if (!(await fileExists(catalogPath))) {
      info(`カタログファイルを作成中: ${catalogPath}`);
      await writeYaml(catalogPath, emptyCatalog);
    }

    success("初期化が完了しました!");
    info("");
    info("次のステップ:");
    info("  1. ANTHROPIC_API_KEY 環境変数を設定してください");
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
  .action(initAction);
