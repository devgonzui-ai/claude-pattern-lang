import yaml from "js-yaml";
import type { PatternInput, PatternType } from "../../types/index.js";
import type { SimilarPair } from "../../core/analyzer/deduplicator.js";

/**
 * LLMによる重複判定結果
 */
export interface DedupeJudgement {
  /** 対象ペアの番号（1始まり） */
  pair: number;
  /** 意味的に重複しているか */
  duplicate: boolean;
  /** 判定理由 */
  reason?: string;
  /** マージ後のパターン提案（duplicate=trueの場合） */
  merged?: PatternInput;
}

/**
 * パターンをプロンプト用のテキストに整形する
 */
function formatPattern(label: string, pattern: SimilarPair["a"]): string {
  const lines = [
    `${label}:`,
    `  name: ${pattern.name}`,
    `  type: ${pattern.type}`,
    `  context: ${pattern.context}`,
  ];
  if (pattern.problem) {
    lines.push(`  problem: ${pattern.problem}`);
  }
  lines.push(`  solution: ${pattern.solution}`);
  if (pattern.tags && pattern.tags.length > 0) {
    lines.push(`  tags: [${pattern.tags.join(", ")}]`);
  }
  return lines.join("\n");
}

/**
 * 重複判定用プロンプトを生成する
 */
export function buildDedupePrompt(pairs: SimilarPair[]): string {
  const pairSections = pairs
    .map((pair, index) => {
      return `### ペア ${index + 1}

${formatPattern("パターンA", pair.a)}

${formatPattern("パターンB", pair.b)}`;
    })
    .join("\n\n");

  return `あなたはソフトウェア開発のパターン分析専門家です。
以下の各ペアについて、2つのパターンが意味的に重複しているか（統合すべきか）を判定してください。

## 判定基準

- 同じ問題を同じアプローチで解決している場合は重複（duplicate: true）
- 対象領域や解決アプローチが異なる場合は重複ではない（duplicate: false）
- 迷った場合は duplicate: false とする（誤統合を避ける）

## 出力形式

以下のYAML形式で、全ペアについて判定を出力してください。
duplicate: true の場合は、両者の良い部分を統合した merged パターンを提案してください。

\`\`\`yaml
judgements:
  - pair: 1
    duplicate: true
    reason: 判定理由（1文）
    merged:
      name: 統合後のパターン名
      type: prompt | solution | code
      context: どのような状況で使うか（1-2文）
      problem: 解決する問題（任意、1文）
      solution: 解決策の要約（2-3文）
      example: 具体的な使用例（任意）
      tags: [関連タグ]
  - pair: 2
    duplicate: false
    reason: 判定理由（1文）
\`\`\`

## 対象ペア

${pairSections}`;
}

/**
 * YAMLコードブロックからYAML文字列を抽出する
 */
function extractYamlFromCodeBlock(response: string): string {
  const codeBlockMatch = response.match(/```(?:yaml)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return response.trim();
}

/**
 * 有効なPatternTypeかどうかを確認する
 */
function isValidPatternType(type: unknown): type is PatternType {
  return type === "prompt" || type === "solution" || type === "code";
}

/**
 * mergedフィールドをPatternInputとしてパースする（不正な場合はundefined）
 */
function parseMerged(raw: unknown): PatternInput | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const merged = raw as Record<string, unknown>;

  if (
    typeof merged.name !== "string" ||
    typeof merged.context !== "string" ||
    typeof merged.solution !== "string" ||
    !isValidPatternType(merged.type)
  ) {
    return undefined;
  }

  const pattern: PatternInput = {
    name: merged.name,
    type: merged.type,
    context: merged.context,
    solution: merged.solution,
  };

  if (typeof merged.problem === "string") {
    pattern.problem = merged.problem;
  }
  if (typeof merged.example === "string") {
    pattern.example = merged.example;
  }
  if (typeof merged.example_prompt === "string") {
    pattern.example_prompt = merged.example_prompt;
  }
  if (Array.isArray(merged.tags)) {
    pattern.tags = merged.tags.filter((t): t is string => typeof t === "string");
  }

  return pattern;
}

/**
 * LLMレスポンスをパースして判定結果を返す
 * @param yamlResponse - LLMからのYAMLレスポンス
 * @param pairCount - 判定対象のペア数（範囲外のpair番号は無視）
 * @returns 判定結果配列（パースに失敗した場合は空配列）
 */
export function parseDedupeResponse(
  yamlResponse: string,
  pairCount: number
): DedupeJudgement[] {
  try {
    const yamlContent = extractYamlFromCodeBlock(yamlResponse);
    const parsed = yaml.load(yamlContent) as { judgements?: unknown[] } | null;

    if (!parsed || !Array.isArray(parsed.judgements)) {
      return [];
    }

    const judgements: DedupeJudgement[] = [];
    const seenPairs = new Set<number>();

    for (const item of parsed.judgements) {
      if (typeof item !== "object" || item === null) {
        continue;
      }

      const raw = item as Record<string, unknown>;

      if (
        typeof raw.pair !== "number" ||
        !Number.isInteger(raw.pair) ||
        raw.pair < 1 ||
        raw.pair > pairCount ||
        seenPairs.has(raw.pair) ||
        typeof raw.duplicate !== "boolean"
      ) {
        continue;
      }

      seenPairs.add(raw.pair);

      const judgement: DedupeJudgement = {
        pair: raw.pair,
        duplicate: raw.duplicate,
      };

      if (typeof raw.reason === "string") {
        judgement.reason = raw.reason;
      }

      if (raw.duplicate) {
        judgement.merged = parseMerged(raw.merged);
      }

      judgements.push(judgement);
    }

    return judgements;
  } catch {
    // YAMLパースエラーの場合は空配列を返す
    return [];
  }
}
