import { describe, it, expect } from "vitest";
import {
  generatePatternsSection,
  generatePatternFileContent,
  generatePatternReference,
  mergePatternsSections,
} from "../../src/core/sync/merger.js";
import type { Pattern } from "../../src/types/index.js";

describe("generatePatternsSection", () => {
  describe("空のパターン配列", () => {
    it("空のパターン配列に対してヘッダーのみ生成する", () => {
      const result = generatePatternsSection([]);

      expect(result).toContain("<!-- CPL:PATTERNS:START -->");
      expect(result).toContain("## Patterns");
      expect(result).toContain("<!-- CPL:PATTERNS:END -->");
      expect(result).toContain("パターンはまだ登録されていません");
    });
  });

  describe("パターンあり", () => {
    it("単一のパターンをMarkdown形式で生成する", () => {
      const patterns: Pattern[] = [
        {
          id: "test-id-1",
          name: "テストパターン",
          type: "prompt",
          context: "テスト用のコンテキスト",
          solution: "テスト用のソリューション",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const result = generatePatternsSection(patterns);

      expect(result).toContain("<!-- CPL:PATTERNS:START -->");
      expect(result).toContain("## Patterns");
      expect(result).toContain("### テストパターン");
      expect(result).toContain("**Type**: prompt");
      expect(result).toContain("**Context**: テスト用のコンテキスト");
      expect(result).toContain("**Solution**: テスト用のソリューション");
      expect(result).toContain("<!-- CPL:PATTERNS:END -->");
    });

    it("複数のパターンを生成する", () => {
      const patterns: Pattern[] = [
        {
          id: "test-id-1",
          name: "パターン1",
          type: "prompt",
          context: "コンテキスト1",
          solution: "ソリューション1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "test-id-2",
          name: "パターン2",
          type: "code",
          context: "コンテキスト2",
          solution: "ソリューション2",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const result = generatePatternsSection(patterns);

      expect(result).toContain("### パターン1");
      expect(result).toContain("### パターン2");
      expect(result).toContain("**Type**: prompt");
      expect(result).toContain("**Type**: code");
    });

    it("オプショナルフィールドが存在する場合も正しく生成する", () => {
      const patterns: Pattern[] = [
        {
          id: "test-id-1",
          name: "詳細パターン",
          type: "solution",
          context: "詳細なコンテキスト",
          problem: "解決すべき問題",
          solution: "詳細なソリューション",
          example: "使用例",
          example_prompt: "プロンプト例",
          related: ["関連パターン1", "関連パターン2"],
          tags: ["tag1", "tag2"],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const result = generatePatternsSection(patterns);

      expect(result).toContain("**Problem**: 解決すべき問題");
      expect(result).toContain("**Example**: 使用例");
      expect(result).toContain("**Example Prompt**: プロンプト例");
      expect(result).toContain("**Related**: 関連パターン1, 関連パターン2");
      expect(result).toContain("**Tags**: tag1, tag2");
    });
  });
});

describe("generatePatternFileContent", () => {
  it("空のパターン配列に対してヘッダーのみ生成する（マーカーなし）", () => {
    const result = generatePatternFileContent([]);

    expect(result).toContain("## Patterns");
    expect(result).toContain("パターンはまだ登録されていません");
    // マーカーは含まれない
    expect(result).not.toContain("<!-- CPL:PATTERNS:START -->");
    expect(result).not.toContain("<!-- CPL:PATTERNS:END -->");
  });

  it("パターンをMarkdown形式で生成する（マーカーなし）", () => {
    const patterns: Pattern[] = [
      {
        id: "test-id-1",
        name: "テストパターン",
        type: "prompt",
        context: "テスト用のコンテキスト",
        solution: "テスト用のソリューション",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePatternFileContent(patterns);

    expect(result).toContain("## Patterns");
    expect(result).toContain("### テストパターン");
    expect(result).toContain("**Type**: prompt");
    // マーカーは含まれない
    expect(result).not.toContain("<!-- CPL:PATTERNS:START -->");
    expect(result).not.toContain("<!-- CPL:PATTERNS:END -->");
  });
});

describe("generatePatternReference", () => {
  it("プロジェクトローカルの参照パスを生成する", () => {
    const result = generatePatternReference(".claude/patterns.md");

    expect(result).toBe("<!-- CPL:PATTERNS:START -->\n@.claude/patterns.md\n<!-- CPL:PATTERNS:END -->");
  });

  it("グローバルの参照パスを生成する", () => {
    const result = generatePatternReference("~/.claude-patterns/patterns.md");

    expect(result).toBe("<!-- CPL:PATTERNS:START -->\n@~/.claude-patterns/patterns.md\n<!-- CPL:PATTERNS:END -->");
  });
});

describe("mergePatternsSections", () => {
  describe("既存セクションがnull", () => {
    it("新しいセクションをそのまま返す", () => {
      const newSection = "<!-- CPL:PATTERNS:START -->\n## Patterns\n<!-- CPL:PATTERNS:END -->";

      const result = mergePatternsSections(null, newSection);

      expect(result).toBe(newSection);
    });
  });

  describe("既存セクションがある", () => {
    it("新しいセクションで置き換える", () => {
      const existing = "<!-- CPL:PATTERNS:START -->\n## Old Patterns\n<!-- CPL:PATTERNS:END -->";
      const newSection = "<!-- CPL:PATTERNS:START -->\n## New Patterns\n<!-- CPL:PATTERNS:END -->";

      const result = mergePatternsSections(existing, newSection);

      expect(result).toBe(newSection);
    });
  });
});
