import type { Pattern } from "../../types/index.js";

/** パターンセクション開始マーカー */
export const PATTERNS_SECTION_START = "<!-- CPL:PATTERNS:START -->";
/** パターンセクション終了マーカー */
export const PATTERNS_SECTION_END = "<!-- CPL:PATTERNS:END -->";

/**
 * パターンからCLAUDE.mdのセクションを生成する
 */
export function generatePatternsSection(patterns: Pattern[]): string {
  const lines: string[] = [PATTERNS_SECTION_START, "## Patterns", ""];

  if (patterns.length === 0) {
    lines.push("パターンはまだ登録されていません。");
  } else {
    for (const pattern of patterns) {
      lines.push(`### ${pattern.name}`);
      lines.push(`**Type**: ${pattern.type}`);
      lines.push(`**Context**: ${pattern.context}`);

      if (pattern.problem) {
        lines.push(`**Problem**: ${pattern.problem}`);
      }

      lines.push(`**Solution**: ${pattern.solution}`);

      if (pattern.example) {
        lines.push(`**Example**: ${pattern.example}`);
      }

      if (pattern.example_prompt) {
        lines.push(`**Example Prompt**: ${pattern.example_prompt}`);
      }

      if (pattern.related && pattern.related.length > 0) {
        lines.push(`**Related**: ${pattern.related.join(", ")}`);
      }

      if (pattern.tags && pattern.tags.length > 0) {
        lines.push(`**Tags**: ${pattern.tags.join(", ")}`);
      }

      lines.push("");
    }
  }

  lines.push(PATTERNS_SECTION_END);

  return lines.join("\n");
}

/**
 * 既存のパターンセクションとマージする
 * 既存セクションは新しいセクションで完全に置き換えられる
 */
export function mergePatternsSections(
  _existing: string | null,
  newSection: string
): string {
  // 現時点では単純に新しいセクションで置き換える
  // 将来的にはマージ戦略を追加可能
  return newSection;
}
