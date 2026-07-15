import { describe, it, expect } from "vitest";
import {
  buildDedupePrompt,
  parseDedupeResponse,
} from "../../src/llm/prompts/detect-duplicates.js";
import type { SimilarPair } from "../../src/core/analyzer/deduplicator.js";
import type { Pattern } from "../../src/types/index.js";

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

const createPair = (overrides: Partial<SimilarPair> = {}): SimilarPair => ({
  a: createPattern({ id: "a", name: "パターンA" }),
  b: createPattern({ id: "b", name: "パターンB" }),
  similarity: 0.8,
  ...overrides,
});

describe("buildDedupePrompt", () => {
  it("全ペアの情報がプロンプトに含まれる", () => {
    const pairs = [
      createPair(),
      createPair({
        a: createPattern({ id: "c", name: "パターンC", tags: ["tag1"] }),
        b: createPattern({ id: "d", name: "パターンD", problem: "問題文" }),
      }),
    ];

    const prompt = buildDedupePrompt(pairs);

    expect(prompt).toContain("### ペア 1");
    expect(prompt).toContain("### ペア 2");
    expect(prompt).toContain("パターンA");
    expect(prompt).toContain("パターンD");
    expect(prompt).toContain("tags: [tag1]");
    expect(prompt).toContain("problem: 問題文");
    expect(prompt).toContain("judgements:");
  });
});

describe("parseDedupeResponse", () => {
  it("YAMLコードブロックから判定結果をパースする", () => {
    const response = `\`\`\`yaml
judgements:
  - pair: 1
    duplicate: true
    reason: 同じ問題を扱っている
    merged:
      name: 統合パターン
      type: solution
      context: 統合コンテキスト
      solution: 統合ソリューション
      tags: [debug]
  - pair: 2
    duplicate: false
    reason: 対象領域が異なる
\`\`\``;

    const result = parseDedupeResponse(response, 2);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      pair: 1,
      duplicate: true,
      reason: "同じ問題を扱っている",
    });
    expect(result[0].merged).toMatchObject({
      name: "統合パターン",
      type: "solution",
      tags: ["debug"],
    });
    expect(result[1]).toMatchObject({ pair: 2, duplicate: false });
    expect(result[1].merged).toBeUndefined();
  });

  it("mergedが不正な場合はundefinedになる", () => {
    const response = `\`\`\`yaml
judgements:
  - pair: 1
    duplicate: true
    merged:
      name: 名前だけ
\`\`\``;

    const result = parseDedupeResponse(response, 1);

    expect(result).toHaveLength(1);
    expect(result[0].duplicate).toBe(true);
    expect(result[0].merged).toBeUndefined();
  });

  it("範囲外・重複したpair番号は無視する", () => {
    const response = `\`\`\`yaml
judgements:
  - pair: 0
    duplicate: true
  - pair: 3
    duplicate: true
  - pair: 1
    duplicate: false
  - pair: 1
    duplicate: true
\`\`\``;

    const result = parseDedupeResponse(response, 2);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ pair: 1, duplicate: false });
  });

  it("コードブロックなしのYAMLもパースできる", () => {
    const response = `judgements:
  - pair: 1
    duplicate: false`;

    const result = parseDedupeResponse(response, 1);

    expect(result).toHaveLength(1);
  });

  it("不正なYAMLは空配列を返す", () => {
    expect(parseDedupeResponse("not: [valid: yaml", 1)).toHaveLength(0);
    expect(parseDedupeResponse("", 1)).toHaveLength(0);
    expect(parseDedupeResponse("plain text", 1)).toHaveLength(0);
  });
});
