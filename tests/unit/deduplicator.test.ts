import { describe, it, expect } from "vitest";
import {
  tokenize,
  calculateSimilarity,
  findDuplicates,
  findSimilarPairs,
  DEFAULT_SIMILARITY_THRESHOLD,
} from "../../src/core/analyzer/deduplicator.js";
import type { Pattern, PatternInput } from "../../src/types/index.js";

const createPattern = (overrides: Partial<Pattern> = {}): Pattern => ({
  id: "test-id",
  name: "テストパターン",
  type: "solution",
  context: "テストコンテキスト",
  solution: "テストソリューション",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("tokenize", () => {
  it("英数字を単語単位で分割する", () => {
    const tokens = tokenize("TypeScript ESM import error");
    expect(tokens.has("typescript")).toBe(true);
    expect(tokens.has("esm")).toBe(true);
    expect(tokens.has("import")).toBe(true);
  });

  it("日本語をバイグラムで分割する", () => {
    const tokens = tokenize("エラー処理");
    expect(tokens.has("エラ")).toBe(true);
    expect(tokens.has("ラー")).toBe(true);
    expect(tokens.has("ー処")).toBe(true);
    expect(tokens.has("処理")).toBe(true);
  });

  it("1文字のCJKもトークンになる", () => {
    const tokens = tokenize("あ b");
    expect(tokens.has("あ")).toBe(true);
    expect(tokens.has("b")).toBe(true);
  });

  it("空文字列は空集合を返す", () => {
    expect(tokenize("").size).toBe(0);
  });
});

describe("calculateSimilarity", () => {
  it("同一内容のパターンは類似度が高い", () => {
    const p1 = createPattern({ id: "1", tags: ["debug", "esm"] });
    const p2 = createPattern({ id: "2", tags: ["debug", "esm"] });

    expect(calculateSimilarity(p1, p2)).toBeGreaterThan(0.9);
  });

  it("無関係なパターンは類似度が低い", () => {
    const p1 = createPattern({
      id: "1",
      name: "ESMインポートパス解決",
      context: "TypeScript + ESM環境でCannot find moduleエラーが発生したとき",
      solution: "インポートパスに.js拡張子を付ける",
      tags: ["esm", "typescript"],
    });
    const p2 = createPattern({
      id: "2",
      name: "react-form-controlled-components",
      context: "Reactでフォームを作成する場合",
      solution: "useStateでフォームデータを単一のオブジェクトとして管理する",
      tags: ["react", "form"],
    });

    expect(calculateSimilarity(p1, p2)).toBeLessThan(DEFAULT_SIMILARITY_THRESHOLD);
  });

  it("typeが異なるとペナルティがかかる", () => {
    const p1 = createPattern({ id: "1", type: "solution" });
    const p2 = createPattern({ id: "2", type: "solution" });
    const p3 = createPattern({ id: "3", type: "code" });

    const sameType = calculateSimilarity(p1, p2);
    const differentType = calculateSimilarity(p1, p3);

    expect(differentType).toBeLessThan(sameType);
  });
});

describe("findDuplicates", () => {
  it("既存パターンとほぼ同一の入力を検出する", () => {
    const existing = createPattern({
      id: "1",
      name: "ESMインポートパス解決",
      context: "TypeScript + ESM環境でCannot find moduleエラーが発生したとき",
      solution: "インポートパスに.js拡張子を付ける。moduleResolution設定も確認する。",
      tags: ["esm", "typescript"],
    });
    const nearDuplicate: PatternInput = {
      name: "ESMのインポートパス解決",
      type: "solution",
      context: "TypeScript + ESM環境でCannot find moduleエラーが出たとき",
      solution: "インポートパスに.js拡張子を付ける。moduleResolution設定も確認。",
      tags: ["esm", "typescript"],
    };
    const unrelated: PatternInput = {
      name: "react-form",
      type: "code",
      context: "Reactでフォームを作成する場合",
      solution: "useStateでフォームデータを管理する",
      tags: ["react"],
    };

    const result = findDuplicates([nearDuplicate, unrelated], [existing]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ESMのインポートパス解決");
  });

  it("既存パターンが空なら何も検出しない", () => {
    const input: PatternInput = {
      name: "test",
      type: "solution",
      context: "context",
      solution: "solution",
    };

    expect(findDuplicates([input], [])).toHaveLength(0);
  });
});

describe("findSimilarPairs", () => {
  it("類似ペアを類似度の高い順に返す", () => {
    const a = createPattern({ id: "a", name: "エラーログ確認手順", tags: ["debug"] });
    const b = createPattern({ id: "b", name: "エラーログ確認の手順", tags: ["debug"] });
    const c = createPattern({
      id: "c",
      name: "react-form-controlled-components",
      context: "Reactでフォームを作成する場合",
      solution: "useStateでフォームデータを管理する",
      type: "code",
      tags: ["react"],
    });

    const pairs = findSimilarPairs([a, b, c]);

    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(pairs[0].a.id).toBe("a");
    expect(pairs[0].b.id).toBe("b");
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i].similarity).toBeLessThanOrEqual(pairs[i - 1].similarity);
    }
  });

  it("しきい値未満のペアは返さない", () => {
    const a = createPattern({ id: "a" });
    const b = createPattern({ id: "b" });

    const pairs = findSimilarPairs([a, b], 1.1);

    expect(pairs).toHaveLength(0);
  });

  it("パターンが1件以下なら空配列を返す", () => {
    expect(findSimilarPairs([createPattern()])).toHaveLength(0);
    expect(findSimilarPairs([])).toHaveLength(0);
  });
});
