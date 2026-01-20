import type { PatternInput, SessionEntry } from "../../types/index.js";

/**
 * セッションログからパターンを抽出する
 */
export async function extractPatterns(
  _entries: SessionEntry[]
): Promise<PatternInput[]> {
  // TODO: 実装 - LLMを使用してパターンを抽出
  return [];
}
