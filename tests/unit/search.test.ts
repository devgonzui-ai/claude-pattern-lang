import { describe, it, expect } from "vitest";
import { filterByType, searchByKeyword } from "../../src/core/catalog/search.js";
import type { Pattern } from "../../src/types/index.js";

const createPattern = (
  overrides: Partial<Pattern> = {}
): Pattern => ({
  id: "test-id",
  name: "テストパターン",
  type: "prompt",
  context: "テストコンテキスト",
  solution: "テストソリューション",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("filterByType", () => {
  it("指定したタイプのパターンのみを返す", () => {
    const patterns: Pattern[] = [
      createPattern({ id: "1", name: "プロンプトパターン", type: "prompt" }),
      createPattern({ id: "2", name: "ソリューションパターン", type: "solution" }),
      createPattern({ id: "3", name: "コードパターン", type: "code" }),
    ];

    const result = filterByType(patterns, "prompt");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("プロンプトパターン");
  });

  it("solutionタイプでフィルタできる", () => {
    const patterns: Pattern[] = [
      createPattern({ id: "1", type: "prompt" }),
      createPattern({ id: "2", type: "solution" }),
      createPattern({ id: "3", type: "solution" }),
    ];

    const result = filterByType(patterns, "solution");

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.type === "solution")).toBe(true);
  });

  it("codeタイプでフィルタできる", () => {
    const patterns: Pattern[] = [
      createPattern({ id: "1", type: "code" }),
      createPattern({ id: "2", type: "prompt" }),
    ];

    const result = filterByType(patterns, "code");

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("code");
  });

  it("該当するパターンがない場合は空配列を返す", () => {
    const patterns: Pattern[] = [
      createPattern({ id: "1", type: "prompt" }),
      createPattern({ id: "2", type: "prompt" }),
    ];

    const result = filterByType(patterns, "code");

    expect(result).toHaveLength(0);
  });

  it("空の配列を渡した場合は空配列を返す", () => {
    const result = filterByType([], "prompt");

    expect(result).toHaveLength(0);
  });
});

describe("searchByKeyword", () => {
  describe("名前(name)での検索", () => {
    it("名前にキーワードが含まれるパターンを返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "デバッグパターン" }),
        createPattern({ id: "2", name: "テストパターン" }),
        createPattern({ id: "3", name: "リファクタリング" }),
      ];

      const result = searchByKeyword(patterns, "デバッグ");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("デバッグパターン");
    });

    it("部分一致で検索できる", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1" }),
        createPattern({ id: "2", name: "パターン2" }),
        createPattern({ id: "3", name: "その他" }),
      ];

      const result = searchByKeyword(patterns, "パターン");

      expect(result).toHaveLength(2);
    });
  });

  describe("コンテキスト(context)での検索", () => {
    it("contextにキーワードが含まれるパターンを返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1", context: "APIエラーハンドリング" }),
        createPattern({ id: "2", name: "パターン2", context: "UIコンポーネント設計" }),
      ];

      const result = searchByKeyword(patterns, "API");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("パターン1");
    });
  });

  describe("ソリューション(solution)での検索", () => {
    it("solutionにキーワードが含まれるパターンを返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1", solution: "try-catchを使用する" }),
        createPattern({ id: "2", name: "パターン2", solution: "Promiseを活用する" }),
      ];

      const result = searchByKeyword(patterns, "Promise");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("パターン2");
    });
  });

  describe("タグ(tags)での検索", () => {
    it("tagsにキーワードが含まれるパターンを返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1", tags: ["typescript", "react"] }),
        createPattern({ id: "2", name: "パターン2", tags: ["python", "django"] }),
      ];

      const result = searchByKeyword(patterns, "typescript");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("パターン1");
    });

    it("tagsが部分一致で検索される", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1", tags: ["error-handling"] }),
        createPattern({ id: "2", name: "パターン2", tags: ["logging"] }),
      ];

      const result = searchByKeyword(patterns, "error");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("パターン1");
    });

    it("tagsがundefinedの場合もエラーにならない", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1", tags: undefined }),
        createPattern({ id: "2", name: "パターン2", tags: ["test"] }),
      ];

      const result = searchByKeyword(patterns, "test");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("パターン2");
    });
  });

  describe("複数フィールドでの検索", () => {
    it("異なるフィールドにマッチするパターンを全て返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "エラー処理", context: "通常のコンテキスト", solution: "通常のソリューション" }),
        createPattern({ id: "2", name: "通常パターン", context: "エラー時の対応", solution: "通常のソリューション" }),
        createPattern({ id: "3", name: "通常パターン", context: "通常のコンテキスト", solution: "エラーをログに出力" }),
        createPattern({ id: "4", name: "通常パターン", context: "通常のコンテキスト", solution: "通常のソリューション", tags: ["エラーハンドリング"] }),
      ];

      const result = searchByKeyword(patterns, "エラー");

      expect(result).toHaveLength(4);
    });
  });

  describe("大文字小文字", () => {
    it("大文字小文字を区別せずに検索する", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "TypeScript Pattern" }),
        createPattern({ id: "2", name: "javascript pattern" }),
      ];

      const result = searchByKeyword(patterns, "typescript");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("TypeScript Pattern");
    });
  });

  describe("エッジケース", () => {
    it("空の配列を渡した場合は空配列を返す", () => {
      const result = searchByKeyword([], "test");

      expect(result).toHaveLength(0);
    });

    it("空のキーワードを渡した場合は全パターンを返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1" }),
        createPattern({ id: "2" }),
      ];

      const result = searchByKeyword(patterns, "");

      expect(result).toHaveLength(2);
    });

    it("マッチするパターンがない場合は空配列を返す", () => {
      const patterns: Pattern[] = [
        createPattern({ id: "1", name: "パターン1" }),
        createPattern({ id: "2", name: "パターン2" }),
      ];

      const result = searchByKeyword(patterns, "存在しないキーワード");

      expect(result).toHaveLength(0);
    });
  });
});
