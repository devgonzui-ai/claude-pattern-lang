import type {
  PatternInput,
  Pattern,
  SessionEntry,
  LLMConfig,
} from "../../types/index.js";
import { createLLMClient } from "../../llm/client.js";
import { buildExtractPrompt, parseExtractResponse } from "../../llm/prompts/extract-patterns.js";
import { sanitize } from "../../utils/sanitizer.js";
import { MetricsCollector } from "../../llm/metrics/collector.js";

/**
 * ツール結果の最大表示文字数
 */
const MAX_TOOL_RESULT_LENGTH = 500;

/**
 * セッションエントリを文字列形式にフォーマットする
 */
export function formatSessionContent(entries: SessionEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const entry of entries) {
    switch (entry.type) {
      case "user":
        lines.push(`[user]\n${entry.message.content}`);
        break;
      case "assistant":
        lines.push(`[assistant]\n${entry.message.content}`);
        break;
      case "tool_use":
        lines.push(
          `[tool_use: ${entry.tool_name}]\n${JSON.stringify(entry.tool_input, null, 2)}`
        );
        break;
      case "tool_result": {
        const output =
          entry.output.length > MAX_TOOL_RESULT_LENGTH
            ? entry.output.slice(0, MAX_TOOL_RESULT_LENGTH) + "..."
            : entry.output;
        lines.push(`[tool_result: ${entry.tool_name}]\n${output}`);
        break;
      }
    }
  }

  return lines.join("\n\n");
}

/**
 * 重複パターンを検出する（名前の完全一致、大文字小文字無視）
 */
export function findDuplicatePatterns(
  newPatterns: PatternInput[],
  existingPatterns: Pattern[]
): PatternInput[] {
  const existingNames = new Set(
    existingPatterns.map((p) => p.name.toLowerCase())
  );

  return newPatterns.filter((p) => existingNames.has(p.name.toLowerCase()));
}

/**
 * セッションログからパターンを抽出する
 * @param entries - セッションエントリ
 * @param existingPatterns - 既存のパターン（重複チェック用）
 * @param llmConfig - LLM設定
 * @param collector - メトリクスコレクター（オプション）
 * @returns 抽出されたパターン（重複除外済み）
 */
export async function extractPatterns(
  entries: SessionEntry[],
  existingPatterns: Pattern[],
  llmConfig: LLMConfig,
  collector?: MetricsCollector
): Promise<PatternInput[]> {
  // 空のエントリは早期リターン
  if (entries.length === 0) {
    return [];
  }

  // セッション内容をフォーマット
  const rawContent = formatSessionContent(entries);

  // 機密情報をマスク
  const sanitizedContent = sanitize(rawContent);

  // プロンプトを構築
  const prompt = buildExtractPrompt(sanitizedContent);

  // LLMクライアントを作成して実行
  const client = await createLLMClient(llmConfig, {
    metricsCollector: collector,
    commandName: "analyze",
  });
  const response = await client.complete(prompt);

  // レスポンスをパース
  const extractedPatterns = parseExtractResponse(response);

  // 重複を除外
  const duplicates = findDuplicatePatterns(extractedPatterns, existingPatterns);
  const duplicateNames = new Set(duplicates.map((p) => p.name.toLowerCase()));

  return extractedPatterns.filter(
    (p) => !duplicateNames.has(p.name.toLowerCase())
  );
}
