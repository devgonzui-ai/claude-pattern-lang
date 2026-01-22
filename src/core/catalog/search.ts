import type { Pattern, PatternType } from "../../types/index.js";

/**
 * 検索オプション
 */
export interface SearchOptions {
  type?: PatternType;
  keyword?: string;
  tags?: string[];
}

/**
 * パターンをタイプでフィルタする
 */
export function filterByType(patterns: Pattern[], type: PatternType): Pattern[] {
  return patterns.filter((p) => p.type === type);
}

/**
 * パターンをキーワードで検索する
 * name, context, solution, tagsを対象に部分一致検索
 * 大文字小文字を区別しない
 */
export function searchByKeyword(patterns: Pattern[], keyword: string): Pattern[] {
  if (!keyword) {
    return patterns;
  }

  const lowerKeyword = keyword.toLowerCase();

  return patterns.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(lowerKeyword);
    const contextMatch = p.context.toLowerCase().includes(lowerKeyword);
    const solutionMatch = p.solution.toLowerCase().includes(lowerKeyword);
    const tagsMatch = p.tags?.some((tag) =>
      tag.toLowerCase().includes(lowerKeyword)
    ) ?? false;

    return nameMatch || contextMatch || solutionMatch || tagsMatch;
  });
}

/**
 * パターンを検索する
 */
export async function searchPatterns(
  _options: SearchOptions
): Promise<Pattern[]> {
  // TODO: 実装
  return [];
}
