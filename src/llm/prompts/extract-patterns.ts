import yaml from "js-yaml";
import type { PatternInput, PatternType } from "../../types/index.js";

/**
 * パターン抽出用プロンプトを生成する
 */
export function buildExtractPrompt(sessionContent: string): string {
  return `あなたはソフトウェア開発のパターン分析専門家です。
以下のClaude Codeセッションログを分析し、再利用可能なパターンを抽出してください。

## 抽出対象

1. **プロンプトパターン** (type: prompt)
   - 効果的だった指示の構造や言い回し
   - 特定の結果を引き出すプロンプトテクニック

2. **問題解決パターン** (type: solution)
   - 繰り返し使われた調査・デバッグ手順
   - 特定の問題に対する解決アプローチ

3. **コードパターン** (type: code)
   - プロジェクト固有のコーディングイディオム
   - 繰り返し生成された構造やテンプレート

## 出力形式

以下のYAML形式で出力してください。パターンが見つからない場合は空の配列を返してください。

\`\`\`yaml
patterns:
  - name: パターン名（短く識別しやすい名前）
    type: prompt | solution | code
    context: どのような状況で使うか（1-2文）
    problem: 解決する問題（任意、1文）
    solution: 解決策の要約（2-3文）
    example: 具体的な使用例（任意）
    example_prompt: プロンプト例（type=promptの場合）
    tags: [関連タグ]
\`\`\`

## 注意事項

- 汎用的すぎるパターン（例：「エラーハンドリング」だけ）は避け、具体的な手法を記述
- プロジェクト固有の文脈が重要な場合は context に明記
- 機密情報（APIキー、パスワード、内部URL等）は含めない
- 1セッションから抽出するパターンは最大5個まで

## セッションログ

${sessionContent}`;
}

/**
 * YAMLコードブロックからYAML文字列を抽出する
 */
function extractYamlFromCodeBlock(response: string): string {
  // ```yaml ... ``` のコードブロックを抽出
  const codeBlockMatch = response.match(/```(?:yaml)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // コードブロックがない場合はそのまま返す
  return response.trim();
}

/**
 * 有効なPatternTypeかどうかを確認する
 */
function isValidPatternType(type: unknown): type is PatternType {
  return type === "prompt" || type === "solution" || type === "code";
}

/**
 * LLMレスポンスをパースしてPatternInput配列を返す
 * @param yamlResponse - LLMからのYAMLレスポンス
 * @returns PatternInput配列（パースに失敗した場合は空配列）
 */
export function parseExtractResponse(yamlResponse: string): PatternInput[] {
  try {
    const yamlContent = extractYamlFromCodeBlock(yamlResponse);
    const parsed = yaml.load(yamlContent) as { patterns?: unknown[] } | null;

    if (!parsed || !Array.isArray(parsed.patterns)) {
      return [];
    }

    const patterns: PatternInput[] = [];

    for (const item of parsed.patterns) {
      if (typeof item !== "object" || item === null) {
        continue;
      }

      const raw = item as Record<string, unknown>;

      // 必須フィールドのチェック
      if (
        typeof raw.name !== "string" ||
        typeof raw.context !== "string" ||
        typeof raw.solution !== "string" ||
        !isValidPatternType(raw.type)
      ) {
        continue;
      }

      const pattern: PatternInput = {
        name: raw.name,
        type: raw.type,
        context: raw.context,
        solution: raw.solution,
      };

      // オプショナルフィールドの追加
      if (typeof raw.problem === "string") {
        pattern.problem = raw.problem;
      }
      if (typeof raw.example === "string") {
        pattern.example = raw.example;
      }
      if (typeof raw.example_prompt === "string") {
        pattern.example_prompt = raw.example_prompt;
      }
      if (Array.isArray(raw.related)) {
        pattern.related = raw.related.filter(
          (r): r is string => typeof r === "string"
        );
      }
      if (Array.isArray(raw.tags)) {
        pattern.tags = raw.tags.filter(
          (t): t is string => typeof t === "string"
        );
      }

      patterns.push(pattern);
    }

    return patterns;
  } catch {
    // YAMLパースエラーの場合は空配列を返す
    return [];
  }
}
