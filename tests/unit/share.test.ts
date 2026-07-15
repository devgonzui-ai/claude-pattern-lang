import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import {
  serializePatterns,
  parseShareContent,
  SHARE_FORMAT_VERSION,
} from "../../src/core/catalog/share.js";
import type { Pattern } from "../../src/types/index.js";

const createPattern = (overrides: Partial<Pattern> = {}): Pattern => ({
  id: "aaaaaaaa-0000-0000-0000-000000000000",
  name: "テストパターン",
  type: "solution",
  context: "テストコンテキスト",
  solution: "テストソリューション",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("serializePatterns", () => {
  it("共有ファイル形式のYAMLを生成する", () => {
    const patterns = [
      createPattern({ tags: ["debug"], problem: "問題", example: "例" }),
    ];

    const content = serializePatterns(patterns);
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.version).toBe(SHARE_FORMAT_VERSION);
    expect(typeof parsed.exported_at).toBe("string");
    expect(parsed.patterns).toHaveLength(1);

    const pattern = (parsed.patterns as Record<string, unknown>[])[0];
    expect(pattern.name).toBe("テストパターン");
    expect(pattern.problem).toBe("問題");
    expect(pattern.tags).toEqual(["debug"]);
  });

  it("ローカル固有の情報（ID・タイムスタンプ・使用実績）を含めない", () => {
    const patterns = [
      createPattern({
        usage_count: 5,
        source_sessions: ["session-1"],
      }),
    ];

    const content = serializePatterns(patterns);
    const parsed = yaml.load(content) as { patterns: Record<string, unknown>[] };

    const pattern = parsed.patterns[0];
    expect(pattern.id).toBeUndefined();
    expect(pattern.created_at).toBeUndefined();
    expect(pattern.updated_at).toBeUndefined();
    expect(pattern.usage_count).toBeUndefined();
    expect(pattern.source_sessions).toBeUndefined();
  });
});

describe("parseShareContent", () => {
  it("共有ファイル形式をパースできる", () => {
    const content = serializePatterns([
      createPattern({ name: "pattern-1" }),
      createPattern({ name: "pattern-2", type: "code" }),
    ]);

    const result = parseShareContent(content);

    expect(result.patterns).toHaveLength(2);
    expect(result.patterns[0].name).toBe("pattern-1");
    expect(result.patterns[1].type).toBe("code");
    expect(result.invalidCount).toBe(0);
  });

  it("カタログ形式（patternsキーのみ）もパースできる", () => {
    const content = yaml.dump({
      patterns: [
        {
          name: "p1",
          type: "prompt",
          context: "c",
          solution: "s",
        },
      ],
    });

    const result = parseShareContent(content);

    expect(result.patterns).toHaveLength(1);
  });

  it("パターン配列のみの形式もパースできる", () => {
    const content = yaml.dump([
      { name: "p1", type: "solution", context: "c", solution: "s" },
    ]);

    const result = parseShareContent(content);

    expect(result.patterns).toHaveLength(1);
  });

  it("必須フィールドが欠けたエントリはinvalidCountに数える", () => {
    const content = yaml.dump({
      patterns: [
        { name: "valid", type: "solution", context: "c", solution: "s" },
        { name: "no-type", context: "c", solution: "s" },
        { name: "", type: "code", context: "c", solution: "s" },
        "not-an-object",
      ],
    });

    const result = parseShareContent(content);

    expect(result.patterns).toHaveLength(1);
    expect(result.invalidCount).toBe(3);
  });

  it("オプションフィールドの型が不正な場合は除外して取り込む", () => {
    const content = yaml.dump({
      patterns: [
        {
          name: "p1",
          type: "solution",
          context: "c",
          solution: "s",
          tags: ["ok", 123],
          problem: 42,
        },
      ],
    });

    const result = parseShareContent(content);

    expect(result.patterns[0].tags).toEqual(["ok"]);
    expect(result.patterns[0].problem).toBeUndefined();
  });

  it("patternsが見つからない構造はエラーを投げる", () => {
    expect(() => parseShareContent(yaml.dump({ foo: "bar" }))).toThrow();
    expect(() => parseShareContent("plain string")).toThrow();
  });
});
