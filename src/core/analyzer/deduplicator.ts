import type { Pattern, PatternInput } from "../../types/index.js";

/**
 * 類似候補と判定するデフォルトのしきい値
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.35;

/**
 * 新規パターン取り込み時に「ほぼ同一」とみなすしきい値
 * （誤検出を避けるため候補検出より高めに設定）
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.75;

/**
 * 類似パターンのペア
 */
export interface SimilarPair {
  a: Pattern;
  b: Pattern;
  similarity: number;
}

/**
 * テキストをトークン集合に変換する
 * 英数字は単語単位、日本語（CJK）は文字バイグラム単位で分割する
 */
export function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  const lower = text.toLowerCase();

  // 英数字の単語
  for (const match of lower.matchAll(/[a-z0-9_.-]+/g)) {
    tokens.add(match[0]);
  }

  // CJK（ひらがな・カタカナ・漢字）はバイグラム
  for (const match of lower.matchAll(/[぀-ヿ一-鿿]+/g)) {
    const run = match[0];
    if (run.length === 1) {
      tokens.add(run);
      continue;
    }
    for (let i = 0; i < run.length - 1; i++) {
      tokens.add(run.slice(i, i + 2));
    }
  }

  return tokens;
}

/**
 * Jaccard係数を計算する（両方空なら0）
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection++;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * パターンの類似度を計算する（0〜1）
 * name / context+problem / solution / tags の字句類似度の加重平均。
 * typeが異なる場合はペナルティを掛ける。
 */
export function calculateSimilarity(
  pattern1: PatternInput | Pattern,
  pattern2: PatternInput | Pattern
): number {
  const nameSim = jaccard(tokenize(pattern1.name), tokenize(pattern2.name));
  const contextSim = jaccard(
    tokenize(`${pattern1.context} ${pattern1.problem ?? ""}`),
    tokenize(`${pattern2.context} ${pattern2.problem ?? ""}`)
  );
  const solutionSim = jaccard(
    tokenize(pattern1.solution),
    tokenize(pattern2.solution)
  );
  const tagsSim = jaccard(
    new Set((pattern1.tags ?? []).map((t) => t.toLowerCase())),
    new Set((pattern2.tags ?? []).map((t) => t.toLowerCase()))
  );

  const base =
    nameSim * 0.3 + contextSim * 0.25 + solutionSim * 0.3 + tagsSim * 0.15;

  return pattern1.type === pattern2.type ? base : base * 0.7;
}

/**
 * 新しいパターンと既存パターンの重複をチェック
 * 既存パターンとの類似度がしきい値以上の入力を返す
 */
export function findDuplicates(
  newPatterns: PatternInput[],
  existingPatterns: Pattern[],
  threshold: number = NEAR_DUPLICATE_THRESHOLD
): PatternInput[] {
  return newPatterns.filter((newPattern) =>
    existingPatterns.some(
      (existing) => calculateSimilarity(newPattern, existing) >= threshold
    )
  );
}

/**
 * カタログ内の類似パターンペアを検出する
 * 類似度の高い順に返す
 */
export function findSimilarPairs(
  patterns: Pattern[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): SimilarPair[] {
  const pairs: SimilarPair[] = [];

  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const similarity = calculateSimilarity(patterns[i], patterns[j]);
      if (similarity >= threshold) {
        pairs.push({ a: patterns[i], b: patterns[j], similarity });
      }
    }
  }

  return pairs.sort((p1, p2) => p2.similarity - p1.similarity);
}
