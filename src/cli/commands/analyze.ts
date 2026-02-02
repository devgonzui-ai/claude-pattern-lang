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
import { info, success, error, warn, stringifyError } from "../../utils/logger.js";
import { fileExists, readYaml, getConfigPath } from "../../utils/fs.js";
import { displayMetricsSummary } from "../../utils/formatters.js";
import { MetricsCollector } from "../../llm/metrics/collector.js";
import { MetricsStorage } from "../../llm/metrics/storage.js";
import type { LLMConfig, PatternInput, Config, MetricsConfig } from "../../types/index.js";
import { DEFAULT_CONFIG } from "../../types/config.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

interface AnalyzeOptions {
  session?: string;
  file?: string;
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
  .description(t("cli.commands.analyze.description"))
  .option("-s, --session <id>", t("cli.commands.analyze.options.session"))
  .option("-f, --file <path>", t("cli.commands.analyze.options.file"))
  .option("-d, --since <date>", t("cli.commands.analyze.options.since"))
  .option("-p, --project <path>", t("cli.commands.analyze.options.project"))
  .option("--dry-run", t("cli.commands.analyze.options.dryRun"))
  .option("--auto-approve", t("cli.commands.analyze.options.autoApprove"))
  .action(async (options: AnalyzeOptions) => {
    try {
      // ファイルが直接指定された場合
      if (options.file) {
        if (!(await fileExists(options.file))) {
          error(t("messages.add.fileNotFound", { path: options.file }));
          return;
        }
        // ファイルから直接解析
        await analyzeFile(options.file, options);
        return;
      }

      // セッション一覧を取得
      let sessions = await listSessions(options.project);

      if (sessions.length === 0) {
        warn(t("messages.analyze.noSessions"));
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
        warn(t("messages.analyze.noMatchingSessions"));
        return;
      }

      info(t("messages.analyze.analyzingSessions", { count: sessions.length }));

      // 設定を読み込み
      let llmConfig: LLMConfig = DEFAULT_CONFIG.llm;
      let metricsConfig: MetricsConfig = DEFAULT_CONFIG.metrics;
      const configPath = getConfigPath();
      if (await fileExists(configPath)) {
        const config = await readYaml<Config>(configPath);
        if (config) {
          llmConfig = config.llm || DEFAULT_CONFIG.llm;
          metricsConfig = config.metrics || DEFAULT_CONFIG.metrics;
          info(t("messages.analyze.llmProvider", { provider: llmConfig.provider, model: llmConfig.model }));
        }
      } else {
        warn(t("messages.analyze.configNotFound"));
        info(t("messages.analyze.configCustomize"));
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
        format: t("messages.analyze.progressFormat"),
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
          error(`\n${t("messages.analyze.sessionError", { id: session.id, error: stringifyError(err) })}`);
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
        info(t("messages.analyze.noNewPatterns"));

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
      info(`\n${t("messages.analyze.extractedPatterns", { count: allExtracted.length })}`);
      console.log(yaml.dump(allExtracted, { lineWidth: -1 }));

      // dry-runの場合は保存しない
      if (options.dryRun) {
        info(t("messages.analyze.dryRun"));

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
        const shouldSave = await confirm(`\n${t("messages.analyze.saveConfirm")}`);
        if (!shouldSave) {
          info(t("messages.analyze.saveCancelled"));

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

      success(t("messages.analyze.patternsSaved", { count: allExtracted.length }));

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
      error(t("messages.analyze.error", { error: stringifyError(err) }));
    }
  });

/**
 * 単一ファイルを解析
 */
async function analyzeFile(filePath: string, options: AnalyzeOptions): Promise<void> {
  // 設定を読み込み
  let llmConfig: LLMConfig = DEFAULT_CONFIG.llm;
  let metricsConfig: MetricsConfig = DEFAULT_CONFIG.metrics;
  const configPath = getConfigPath();
  if (await fileExists(configPath)) {
    const config = await readYaml<Config>(configPath);
    if (config) {
      llmConfig = config.llm || DEFAULT_CONFIG.llm;
      metricsConfig = config.metrics || DEFAULT_CONFIG.metrics;
      info(t("messages.analyze.llmProvider", { provider: llmConfig.provider, model: llmConfig.model }));
    }
  } else {
    warn(t("messages.analyze.configNotFound"));
    info(t("messages.analyze.configCustomize"));
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

  info(t("messages.analyze.analyzingSessions", { count: 1 }));

  // ファイルを解析
  const allExtracted: PatternInput[] = [];
  try {
    const entries = await parseSessionLog(filePath);

    if (entries.length === 0) {
      info(t("messages.analyze.noNewPatterns"));

      // メトリクスサマリー表示
      if (metricsConfig.enabled && collector) {
        const commandMetrics = collector.endCommand("analyze");
        if (commandMetrics) {
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
      }
      return;
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
  } catch (err) {
    error(t("messages.analyze.error", { error: stringifyError(err) }));

    // メトリクスサマリー表示
    if (metricsConfig.enabled && collector) {
      const commandMetrics = collector.endCommand("analyze");
      displayMetricsSummary(
        commandMetrics,
        collector.getLLMMetrics(),
        metricsConfig.output_level
      );
    }
    return;
  }

  // コマンド終了
  let commandMetrics = null;
  if (collector) {
    commandMetrics = collector.endCommand("analyze");
  }

  if (allExtracted.length === 0) {
    info(t("messages.analyze.noNewPatterns"));

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
  info(`\n${t("messages.analyze.extractedPatterns", { count: allExtracted.length })}`);
  console.log(yaml.dump(allExtracted, { lineWidth: -1 }));

  // dry-runの場合は保存しない
  if (options.dryRun) {
    info(t("messages.analyze.dryRun"));

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
    const shouldSave = await confirm(`\n${t("messages.analyze.saveConfirm")}`);
    if (!shouldSave) {
      info(t("messages.analyze.saveCancelled"));

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

  success(t("messages.analyze.patternsSaved", { count: allExtracted.length }));

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
}
