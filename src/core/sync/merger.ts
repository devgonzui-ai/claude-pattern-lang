import type { Pattern } from "../../types/index.js";

/** パターンセクション開始マーカー */
export const PATTERNS_SECTION_START = "<!-- CPL:PATTERNS:START -->";
/** パターンセクション終了マーカー */
export const PATTERNS_SECTION_END = "<!-- CPL:PATTERNS:END -->";

/**
 * パターンの内容をMarkdown形式で生成する（patterns.mdファイル用）
 * マーカーは含まない
 */
export function generatePatternFileContent(patterns: Pattern[]): string {
  const lines: string[] = ["## Patterns", ""];

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

  return lines.join("\n");
}

/**
 * CLAUDE.md用の@参照セクションを生成する
 * @param referencePath patterns.mdへの参照パス（例: ".claude/patterns.md"）
 */
export function generatePatternReference(referencePath: string): string {
  const lines: string[] = [
    PATTERNS_SECTION_START,
    `@${referencePath}`,
    PATTERNS_SECTION_END,
  ];
  return lines.join("\n");
}

/**
 * パターンからCLAUDE.mdのセクションを生成する（従来方式、後方互換性用）
 * @deprecated generatePatternReference() と generatePatternFileContent() を使用してください
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
