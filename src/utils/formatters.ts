import type { CommandMetrics, LLMMetrics, MetricsStatistics, OutputLevel } from "../types/index.js";
import { table } from "table";
import { t } from "../i18n/index.js";

/**
 * トークン使用量をフォーマット
 */
export function formatTokenUsage(tokens: number): string {
  return tokens.toLocaleString();
}

/**
 * 実行時間をフォーマット
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * メトリクスサマリーを表示
 */
export function displayMetricsSummary(
  commandMetrics: CommandMetrics | null,
  llmMetrics: LLMMetrics[],
  outputLevel: OutputLevel
): void {
  if (outputLevel === "minimal") {
    console.log(`Duration: ${commandMetrics ? formatDuration(commandMetrics.duration_ms) : "N/A"}`);
    return;
  }

  console.log(`\n${t("ui.labels.metricsSummary")}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (commandMetrics) {
    console.log(`Command: ${commandMetrics.command}`);
    console.log(`Duration: ${formatDuration(commandMetrics.duration_ms)}`);
    console.log();

    console.log(`${t("ui.labels.llmCalls")}: ${commandMetrics.llm_calls}`);

    const totalTokens = commandMetrics.total_tokens;
    const hasTokenData = totalTokens > 0;

    if (hasTokenData) {
      // 入力/出力の集計
      let inputTotal = 0;
      let outputTotal = 0;

      for (const m of llmMetrics) {
        if (m.token_usage.available) {
          inputTotal += m.token_usage.input_tokens;
          outputTotal += m.token_usage.output_tokens;
        }
      }

      console.log(`  ${t("ui.labels.inputTokens")}:  ${formatTokenUsage(inputTotal)}`);
      console.log(`  ${t("ui.labels.outputTokens")}: ${formatTokenUsage(outputTotal)}`);
      console.log(`  ${t("ui.labels.totalTokens")}:  ${formatTokenUsage(totalTokens)}`);
    } else {
      console.log(`  ${t("ui.labels.totalTokens")}:  ${t("ui.labels.providerNotSupported")}`);
    }

    console.log(`  ${t("ui.labels.avgResponse")}:  ${formatDuration(commandMetrics.avg_response_ms)}`);
  } else {
    console.log(t("ui.labels.noMetrics"));
  }

  // verboseモードでは詳細を表示
  if (outputLevel === "verbose" && llmMetrics.length > 0) {
    console.log(`\n${t("ui.labels.llmCallDetails")}`);
    for (let i = 0; i < llmMetrics.length; i++) {
      const m = llmMetrics[i];
      console.log(`  [${i + 1}] ${m.provider}/${m.model}`);
      console.log(`      Response: ${formatDuration(m.performance.llm_duration_ms)}`);
      if (m.token_usage.available) {
        console.log(
          `      Tokens: ${m.token_usage.input_tokens} in / ${m.token_usage.output_tokens} out`
        );
      }
    }
  }

  console.log();
}

/**
 * メトリクス履歴を表示
 */
export function displayMetricsHistory(commands: CommandMetrics[]): void {
  if (commands.length === 0) {
    console.log(t("ui.labels.noCommandHistory"));
    return;
  }

  console.log(`\n${t("ui.labels.commandHistory")}`);

  const data = [
    ["Timestamp", "Command", "Duration", "Calls", "Tokens"],
  ];

  for (const cmd of commands) {
    const timestamp = new Date(cmd.timestamp).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const duration = formatDuration(cmd.duration_ms);
    const calls = cmd.llm_calls.toString();
    const tokens = cmd.total_tokens > 0 ? formatTokenUsage(cmd.total_tokens) : "N/A";

    data.push([timestamp, cmd.command, duration, calls, tokens]);
  }

  console.log(table(data, {
    border: {
      topBody: "┌──────────────┬─────────┬──────────┬───────┬─────────┐",
      topJoin: "├──────────────┼─────────┼──────────┼───────┼─────────┤",
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      bottomBody: "└──────────────┴─────────┴──────────┴───────┴─────────┘",
      bottomJoin: "┴",
      joinBody: "│",
      joinLeft: "├",
      joinRight: "┤",
      joinJoin: "┼",
    },
    columns: {
      0: { width: 14, alignment: "left" },
      1: { width: 10, alignment: "left" },
      2: { width: 10, alignment: "right" },
      3: { width: 7, alignment: "right" },
      4: { width: 9, alignment: "right" },
    },
  }));
}

/**
 * 統計情報を表示
 */
export function displayStatistics(stats: MetricsStatistics, days: number): void {
  console.log(`\n${t("ui.labels.statistics", { days })}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`${t("ui.labels.commands")}:     ${stats.commands}`);
  console.log(`${t("ui.labels.llmCalls")}:    ${stats.llm_calls}`);
  console.log(`${t("ui.labels.totalTokens")}: ${formatTokenUsage(stats.total_tokens)}`);
  console.log(`${t("ui.labels.avgResponse")}: ${formatDuration(stats.avg_response_ms)}`);
  console.log(`${t("ui.labels.totalTime")}:   ${formatDuration(stats.total_duration_ms)}`);
}
