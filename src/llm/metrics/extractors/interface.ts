import type { TokenUsage } from "../../../types/index.js";

/**
 * トークン抽出インターフェース
 */
export interface TokenExtractor<T = any> {
  /**
   * レスポンスからトークン使用量を抽出
   */
  extract(response: T): TokenUsage;
}

/**
 * トークン情報が利用可能でない場合のデフォルト値
 */
export const unavailableTokenUsage: TokenUsage = {
  input_tokens: 0,
  output_tokens: 0,
  total_tokens: 0,
  available: false,
};
