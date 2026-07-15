import type { Pattern, PatternType } from "../../types/index.js";
import { loadCatalog } from "./store.js";

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
 * パターンをタグでフィルタする（いずれかのタグに一致、大文字小文字を区別しない）
 */
export function filterByTags(patterns: Pattern[], tags: string[]): Pattern[] {
  if (tags.length === 0) {
    return patterns;
  }

  const wanted = tags.map((tag) => tag.toLowerCase());

  return patterns.filter((p) =>
    p.tags?.some((tag) => wanted.includes(tag.toLowerCase())) ?? false
  );
}

/**
 * カタログからパターンを検索する
 * type / keyword / tags の各条件をAND結合で適用する
 */
export async function searchPatterns(
  options: SearchOptions
): Promise<Pattern[]> {
  const catalog = await loadCatalog();
  let patterns = catalog.patterns;

  if (options.type) {
    patterns = filterByType(patterns, options.type);
  }
  if (options.keyword) {
    patterns = searchByKeyword(patterns, options.keyword);
  }
  if (options.tags && options.tags.length > 0) {
    patterns = filterByTags(patterns, options.tags);
  }

  return patterns;
}
