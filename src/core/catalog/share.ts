import yaml from "js-yaml";
import type { Pattern, PatternInput, PatternType } from "../../types/index.js";

/**
 * 共有ファイルのフォーマットバージョン
 */
export const SHARE_FORMAT_VERSION = 1;

/**
 * パターン共有ファイル（YAML形式）
 */
export interface ShareFile {
  version: number;
  exported_at: string;
  patterns: PatternInput[];
}

/**
 * パターンを共有用YAML文字列にシリアライズする
 * ID・タイムスタンプ・使用実績などローカル固有の情報は含めない
 */
export function serializePatterns(patterns: Pattern[]): string {
  const shareFile: ShareFile = {
    version: SHARE_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    patterns: patterns.map((p) => {
      const input: PatternInput = {
        name: p.name,
        type: p.type,
        context: p.context,
        solution: p.solution,
      };
      if (p.problem !== undefined) input.problem = p.problem;
      if (p.example !== undefined) input.example = p.example;
      if (p.example_prompt !== undefined) input.example_prompt = p.example_prompt;
      if (p.related !== undefined) input.related = p.related;
      if (p.tags !== undefined) input.tags = p.tags;
      return input;
    }),
  };

  return yaml.dump(shareFile, { lineWidth: -1 });
}

/**
 * 有効なPatternTypeかどうかを確認する
 */
function isValidPatternType(type: unknown): type is PatternType {
  return type === "prompt" || type === "solution" || type === "code";
}

/**
 * 1件のパターンデータをPatternInputとしてパースする（不正な場合はnull）
 */
function parsePatternItem(item: unknown): PatternInput | null {
  if (typeof item !== "object" || item === null) {
    return null;
  }

  const raw = item as Record<string, unknown>;

  if (
    typeof raw.name !== "string" ||
    raw.name.trim() === "" ||
    typeof raw.context !== "string" ||
    typeof raw.solution !== "string" ||
    !isValidPatternType(raw.type)
  ) {
    return null;
  }

  const pattern: PatternInput = {
    name: raw.name,
    type: raw.type,
    context: raw.context,
    solution: raw.solution,
  };

  if (typeof raw.problem === "string") pattern.problem = raw.problem;
  if (typeof raw.example === "string") pattern.example = raw.example;
  if (typeof raw.example_prompt === "string") {
    pattern.example_prompt = raw.example_prompt;
  }
  if (Array.isArray(raw.related)) {
    pattern.related = raw.related.filter((r): r is string => typeof r === "string");
  }
  if (Array.isArray(raw.tags)) {
    pattern.tags = raw.tags.filter((t): t is string => typeof t === "string");
  }

  return pattern;
}

/**
 * 共有ファイルのパース結果
 */
export interface ParseShareResult {
  /** パースできた有効なパターン */
  patterns: PatternInput[];
  /** スキップした不正なエントリ数 */
  invalidCount: number;
}

/**
 * 共有YAML文字列をパースしてパターン入力の配列を返す
 * 共有ファイル形式（{version, patterns}）、カタログ形式（{patterns}）、
 * パターン配列のいずれも受け付ける
 * @throws YAMLとして不正、またはパターンが見つからない構造の場合
 */
export function parseShareContent(content: string): ParseShareResult {
  const parsed = yaml.load(content);

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as Record<string, unknown>).patterns)
  ) {
    items = (parsed as { patterns: unknown[] }).patterns;
  } else {
    throw new Error("no patterns found in content");
  }

  const patterns: PatternInput[] = [];
  let invalidCount = 0;

  for (const item of items) {
    const pattern = parsePatternItem(item);
    if (pattern) {
      patterns.push(pattern);
    } else {
      invalidCount++;
    }
  }

  return { patterns, invalidCount };
}
