import { Command } from "commander";
import yaml from "js-yaml";
import * as cliProgress from "cli-progress";
import {
  listSessions,
  parseSessionLog,
  filterSessionsByDate,
  filterSessionsByProject,
} from "../../core/analyzer/session-parser.js";
import { extractPatterns } from "../../core/analyzer/pattern-extractor.js";
import { loadCatalog, addPattern } from "../../core/catalog/store.js";
import { info, success, error, warn } from "../../utils/logger.js";
import { fileExists, readYaml, getConfigPath } from "../../utils/fs.js";
import { displayMetricsSummary } from "../../utils/formatters.js";
import { MetricsCollector } from "../../llm/metrics/collector.js";
import { MetricsStorage } from "../../llm/metrics/storage.js";
import type { LLMConfig, PatternInput, Config, MetricsConfig } from "../../types/index.js";
import { DEFAULT_CONFIG } from "../../types/config.js";
import * as readline from "node:readline";

interface AnalyzeOptions {
  session?: string;
  since?: string;
  project?: string;
  dryRun?: boolean;
  autoApprove?: boolean;
}

/**
 * ユーザーに確認を求める
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

/**
 * セッション解析コマンド
 * - セッションログを解析してパターンを抽出
 */
export const analyzeCommand = new Command("analyze")
  .description("セッションログを解析してパターンを抽出")
  .option("-s, --session <id>", "特定セッションのみ解析")
  .option("-d, --since <date>", "指定日以降のセッションを解析")
  .option("-p, --project <path>", "特定プロジェクトのみ")
  .option("--dry-run", "保存せず結果のみ表示")
  .option("--auto-approve", "確認なしで保存")
  .action(async (options: AnalyzeOptions) => {
    try {
      // セッション一覧を取得
      let sessions = await listSessions(options.project);

      if (sessions.length === 0) {
        warn("解析対象のセッションが見つかりませんでした。");
        return;
      }

      // フィルタリング
      if (options.since) {
        sessions = filterSessionsByDate(sessions, options.since);
      }

      if (options.project) {
        sessions = filterSessionsByProject(sessions, options.project);
      }

      // 特定セッションのみ
      if (options.session) {
        sessions = sessions.filter((s) => s.id === options.session);
      }

      if (sessions.length === 0) {
        warn("フィルタ条件に一致するセッションがありません。");
        return;
      }

      info(`${sessions.length} 件のセッションを解析します...`);

      // 設定を読み込み
      let llmConfig: LLMConfig = DEFAULT_CONFIG.llm;
      let metricsConfig: MetricsConfig = DEFAULT_CONFIG.metrics;
      const configPath = getConfigPath();
      if (await fileExists(configPath)) {
        const config = await readYaml<Config>(configPath);
        if (config) {
          llmConfig = config.llm || DEFAULT_CONFIG.llm;
          metricsConfig = config.metrics || DEFAULT_CONFIG.metrics;
          info(`LLMプロバイダー: ${llmConfig.provider} (${llmConfig.model})`);
        }
      } else {
        warn("設定ファイルが見つかりません。デフォルト設定を使用します。");
        info("設定をカスタマイズするには `cpl init` を実行してください。");
      }

      // メトリクス収集の初期化
      const collector = metricsConfig.enabled ? new MetricsCollector() : undefined;
      const storage = metricsConfig.enabled ? new MetricsStorage() : undefined;

      // コマンド開始
      if (collector) {
        collector.startCommand("analyze");
      }

      // 既存パターンを取得
      const catalog = await loadCatalog();
      const existingPatterns = catalog.patterns;

      // 各セッションを解析
      const allExtracted: PatternInput[] = [];

      // プログレスバーの作成
      const progressBar = new cliProgress.SingleBar({
        format: '解析中 |{bar}| {percentage}% | {value}/{total} セッション | パターン数: {patterns}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
      });

      progressBar.start(sessions.length, 0, { patterns: 0 });

      for (const session of sessions) {
        try {
          const entries = await parseSessionLog(session.path);

          if (entries.length === 0) {
            progressBar.increment({ patterns: allExtracted.length });
            continue;
          }

          const patterns = await extractPatterns(
            entries,
            existingPatterns,
            llmConfig,
            collector
          );

          if (patterns.length > 0) {
            allExtracted.push(...patterns);
          }

          progressBar.increment({ patterns: allExtracted.length });
        } catch (err) {
          error(`\nセッション ${session.id} の解析中にエラー: ${err}`);
          progressBar.increment({ patterns: allExtracted.length });
        }
      }

      progressBar.stop();

      // コマンド終了
      let commandMetrics = null;
      if (collector) {
        commandMetrics = collector.endCommand("analyze");
      }

      if (allExtracted.length === 0) {
        info("新しいパターンは抽出されませんでした。");

        // メトリクスサマリー表示
        if (metricsConfig.enabled && collector && commandMetrics) {
          displayMetricsSummary(
            commandMetrics,
            collector.getLLMMetrics(),
            metricsConfig.output_level
          );

          // 自動保存
          if (metricsConfig.auto_save && storage) {
            await storage.addLLMMetrics(collector.getLLMMetrics());
            await storage.addCommandMetrics(commandMetrics);
            await storage.applyRetention(metricsConfig);
          }
        }
        return;
      }

      // 結果を表示
      info(`\n抽出されたパターン (${allExtracted.length} 件):`);
      console.log(yaml.dump(allExtracted, { lineWidth: -1 }));

      // dry-runの場合は保存しない
      if (options.dryRun) {
        info("[dry-run] パターンは保存されませんでした。");

        // メトリクスサマリー表示
        if (metricsConfig.enabled && collector && commandMetrics) {
          displayMetricsSummary(
            commandMetrics,
            collector.getLLMMetrics(),
            metricsConfig.output_level
          );
        }
        return;
      }

      // 確認
      if (!options.autoApprove) {
        const shouldSave = await confirm("\nこれらのパターンを保存しますか?");
        if (!shouldSave) {
          info("保存をキャンセルしました。");

          // メトリクスサマリー表示
          if (metricsConfig.enabled && collector && commandMetrics) {
            displayMetricsSummary(
              commandMetrics,
              collector.getLLMMetrics(),
              metricsConfig.output_level
            );
          }
          return;
        }
      }

      // 保存
      for (const pattern of allExtracted) {
        await addPattern(pattern);
      }

      success(`${allExtracted.length} 件のパターンを保存しました。`);

      // メトリクスサマリー表示と保存
      if (metricsConfig.enabled && collector && commandMetrics) {
        displayMetricsSummary(
          commandMetrics,
          collector.getLLMMetrics(),
          metricsConfig.output_level
        );

        // 自動保存
        if (metricsConfig.auto_save && storage) {
          await storage.addLLMMetrics(collector.getLLMMetrics());
          await storage.addCommandMetrics(commandMetrics);
          await storage.applyRetention(metricsConfig);
        }
      }
    } catch (err) {
      error(`エラー: ${err}`);
    }
  });
