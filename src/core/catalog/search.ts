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
 * パターンを検索する
 */
export async function searchPatterns(
  _options: SearchOptions
): Promise<Pattern[]> {
  // TODO: 実装
  return [];
}
