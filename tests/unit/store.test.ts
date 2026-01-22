import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadCatalog,
  saveCatalog,
  addPattern,
  removePattern,
  getPattern,
} from "../../src/core/catalog/store.js";
import type { PatternCatalog, PatternInput } from "../../src/types/index.js";

// fs.tsのモック
vi.mock("../../src/utils/fs.js", () => ({
  getCatalogPath: vi.fn(() => "/mock/.claude-patterns/patterns.yaml"),
  readYaml: vi.fn(),
  writeYaml: vi.fn(),
}));

// crypto.randomUUIDのモック
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "mock-uuid-1234"),
});

import { getCatalogPath, readYaml, writeYaml } from "../../src/utils/fs.js";

const mockedReadYaml = vi.mocked(readYaml);
const mockedWriteYaml = vi.mocked(writeYaml);

describe("store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("loadCatalog", () => {
    it("カタログファイルを読み込んで返す", async () => {
      const mockCatalog: PatternCatalog = {
        patterns: [
          {
            id: "test-id",
            name: "テストパターン",
            type: "prompt",
            context: "テストコンテキスト",
            solution: "テストソリューション",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
      mockedReadYaml.mockResolvedValue(mockCatalog);

      const result = await loadCatalog();

      expect(mockedReadYaml).toHaveBeenCalledWith(
        "/mock/.claude-patterns/patterns.yaml"
      );
      expect(result).toEqual(mockCatalog);
    });

    it("カタログファイルが存在しない場合は空のカタログを返す", async () => {
      mockedReadYaml.mockResolvedValue(null);

      const result = await loadCatalog();

      expect(result).toEqual({ patterns: [] });
    });

    it("100ms以内に完了する", async () => {
      mockedReadYaml.mockResolvedValue({ patterns: [] });

      const start = performance.now();
      await loadCatalog();
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe("saveCatalog", () => {
    it("カタログをYAMLファイルに保存する", async () => {
      const catalog: PatternCatalog = {
        patterns: [
          {
            id: "test-id",
            name: "テストパターン",
            type: "prompt",
            context: "テストコンテキスト",
            solution: "テストソリューション",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      };
      mockedWriteYaml.mockResolvedValue(undefined);

      await saveCatalog(catalog);

      expect(mockedWriteYaml).toHaveBeenCalledWith(
        "/mock/.claude-patterns/patterns.yaml",
        catalog
      );
    });
  });

  describe("addPattern", () => {
    it("パターンを追加してUUIDとタイムスタンプを自動設定する", async () => {
      mockedReadYaml.mockResolvedValue({ patterns: [] });
      mockedWriteYaml.mockResolvedValue(undefined);

      const input: PatternInput = {
        name: "新しいパターン",
        type: "prompt",
        context: "新しいコンテキスト",
        solution: "新しいソリューション",
      };

      const result = await addPattern(input);

      expect(result.id).toBe("mock-uuid-1234");
      expect(result.name).toBe("新しいパターン");
      expect(result.type).toBe("prompt");
      expect(result.context).toBe("新しいコンテキスト");
      expect(result.solution).toBe("新しいソリューション");
      expect(result.created_at).toBe("2026-01-21T12:00:00.000Z");
      expect(result.updated_at).toBe("2026-01-21T12:00:00.000Z");
    });

    it("パターンを追加した後にカタログを保存する", async () => {
      mockedReadYaml.mockResolvedValue({ patterns: [] });
      mockedWriteYaml.mockResolvedValue(undefined);

      const input: PatternInput = {
        name: "新しいパターン",
        type: "prompt",
        context: "新しいコンテキスト",
        solution: "新しいソリューション",
      };

      await addPattern(input);

      expect(mockedWriteYaml).toHaveBeenCalledWith(
        "/mock/.claude-patterns/patterns.yaml",
        expect.objectContaining({
          patterns: expect.arrayContaining([
            expect.objectContaining({
              name: "新しいパターン",
            }),
          ]),
        })
      );
    });

    it("既存のパターンがあっても追加される", async () => {
      const existingPattern = {
        id: "existing-id",
        name: "既存パターン",
        type: "prompt" as const,
        context: "既存コンテキスト",
        solution: "既存ソリューション",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      mockedReadYaml.mockResolvedValue({ patterns: [existingPattern] });
      mockedWriteYaml.mockResolvedValue(undefined);

      const input: PatternInput = {
        name: "新しいパターン",
        type: "solution",
        context: "新しいコンテキスト",
        solution: "新しいソリューション",
      };

      await addPattern(input);

      expect(mockedWriteYaml).toHaveBeenCalledWith(
        "/mock/.claude-patterns/patterns.yaml",
        expect.objectContaining({
          patterns: expect.arrayContaining([
            existingPattern,
            expect.objectContaining({
              name: "新しいパターン",
            }),
          ]),
        })
      );
    });

    it("オプションフィールドも保持される", async () => {
      mockedReadYaml.mockResolvedValue({ patterns: [] });
      mockedWriteYaml.mockResolvedValue(undefined);

      const input: PatternInput = {
        name: "フルパターン",
        type: "code",
        context: "コンテキスト",
        solution: "ソリューション",
        problem: "問題",
        example: "例",
        example_prompt: "プロンプト例",
        related: ["関連1", "関連2"],
        tags: ["tag1", "tag2"],
      };

      const result = await addPattern(input);

      expect(result.problem).toBe("問題");
      expect(result.example).toBe("例");
      expect(result.example_prompt).toBe("プロンプト例");
      expect(result.related).toEqual(["関連1", "関連2"]);
      expect(result.tags).toEqual(["tag1", "tag2"]);
    });
  });

  describe("getPattern", () => {
    it("名前でパターンを取得する", async () => {
      const mockPattern = {
        id: "test-id",
        name: "テストパターン",
        type: "prompt" as const,
        context: "テストコンテキスト",
        solution: "テストソリューション",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      mockedReadYaml.mockResolvedValue({ patterns: [mockPattern] });

      const result = await getPattern("テストパターン");

      expect(result).toEqual(mockPattern);
    });

    it("存在しないパターンの場合はnullを返す", async () => {
      mockedReadYaml.mockResolvedValue({ patterns: [] });

      const result = await getPattern("存在しないパターン");

      expect(result).toBeNull();
    });

    it("複数パターンがある場合に正しいパターンを返す", async () => {
      const patterns = [
        {
          id: "id1",
          name: "パターン1",
          type: "prompt" as const,
          context: "コンテキスト1",
          solution: "ソリューション1",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "id2",
          name: "パターン2",
          type: "solution" as const,
          context: "コンテキスト2",
          solution: "ソリューション2",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ];
      mockedReadYaml.mockResolvedValue({ patterns });

      const result = await getPattern("パターン2");

      expect(result?.name).toBe("パターン2");
    });
  });

  describe("removePattern", () => {
    it("名前でパターンを削除してtrueを返す", async () => {
      const mockPattern = {
        id: "test-id",
        name: "削除対象",
        type: "prompt" as const,
        context: "コンテキスト",
        solution: "ソリューション",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      mockedReadYaml.mockResolvedValue({ patterns: [mockPattern] });
      mockedWriteYaml.mockResolvedValue(undefined);

      const result = await removePattern("削除対象");

      expect(result).toBe(true);
      expect(mockedWriteYaml).toHaveBeenCalledWith(
        "/mock/.claude-patterns/patterns.yaml",
        { patterns: [] }
      );
    });

    it("存在しないパターンの場合はfalseを返す", async () => {
      mockedReadYaml.mockResolvedValue({ patterns: [] });

      const result = await removePattern("存在しないパターン");

      expect(result).toBe(false);
      expect(mockedWriteYaml).not.toHaveBeenCalled();
    });

    it("他のパターンは削除されない", async () => {
      const pattern1 = {
        id: "id1",
        name: "残すパターン",
        type: "prompt" as const,
        context: "コンテキスト1",
        solution: "ソリューション1",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      const pattern2 = {
        id: "id2",
        name: "削除対象",
        type: "solution" as const,
        context: "コンテキスト2",
        solution: "ソリューション2",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      mockedReadYaml.mockResolvedValue({ patterns: [pattern1, pattern2] });
      mockedWriteYaml.mockResolvedValue(undefined);

      await removePattern("削除対象");

      expect(mockedWriteYaml).toHaveBeenCalledWith(
        "/mock/.claude-patterns/patterns.yaml",
        { patterns: [pattern1] }
      );
    });
  });
});
