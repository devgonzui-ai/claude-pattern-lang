import { describe, it, expect } from "vitest";
import {
  stripSystemReminders,
  extractScannableMessage,
  parseScannableMessages,
  scanMessagesForPatterns,
  type ScannableMessage,
} from "../../src/core/analyzer/usage-scanner.js";
import type { Pattern } from "../../src/types/index.js";

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: "id-1",
    name: "test-pattern",
    type: "solution",
    context: "テストのコンテキスト",
    solution: "テストのソリューション",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function message(text: string, timestamp = "2024-06-01T00:00:00Z"): ScannableMessage {
  return { text, timestamp };
}

describe("stripSystemReminders", () => {
  it("system-reminderブロックを除去する", () => {
    const text = "before <system-reminder>秘密のパターン名</system-reminder> after";
    expect(stripSystemReminders(text)).toBe("before  after");
  });

  it("複数ブロックも除去する", () => {
    const text = "<system-reminder>a</system-reminder>x<system-reminder>b</system-reminder>";
    expect(stripSystemReminders(text)).toBe("x");
  });

  it("ブロックがなければそのまま返す", () => {
    expect(stripSystemReminders("plain text")).toBe("plain text");
  });
});

describe("extractScannableMessage", () => {
  it("文字列contentのuserエントリからテキストを抽出する", () => {
    const result = extractScannableMessage({
      type: "user",
      message: { role: "user", content: "hello" },
      timestamp: "2024-06-01T00:00:00Z",
    });
    expect(result).toEqual({ text: "hello", timestamp: "2024-06-01T00:00:00Z" });
  });

  it("配列contentのassistantエントリからtextブロックを抽出する（実ログ形式）", () => {
    const result = extractScannableMessage({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "part1" },
          { type: "tool_use", name: "Read", input: {} },
          { type: "text", text: "part2" },
        ],
      },
      timestamp: "2024-06-01T00:00:00Z",
    });
    expect(result?.text).toBe("part1\npart2");
  });

  it("配列content内のtool_resultブロックはスキップする（patterns.md読込の誤検出防止）", () => {
    const result = extractScannableMessage({
      type: "user",
      message: {
        role: "user",
        content: [
          { type: "tool_result", content: "### test-pattern の内容..." },
        ],
      },
      timestamp: "2024-06-01T00:00:00Z",
    });
    expect(result).toBeNull();
  });

  it("user/assistant以外のエントリはスキップする", () => {
    expect(
      extractScannableMessage({ type: "file-history-snapshot", data: {} })
    ).toBeNull();
    expect(
      extractScannableMessage({
        type: "tool_result",
        tool_name: "Read",
        output: "test-pattern",
        timestamp: "2024-06-01T00:00:00Z",
      })
    ).toBeNull();
  });

  it("system-reminder内のテキストは除去される", () => {
    const result = extractScannableMessage({
      type: "user",
      message: {
        role: "user",
        content: "say <system-reminder>test-pattern</system-reminder> hi",
      },
      timestamp: "2024-06-01T00:00:00Z",
    });
    expect(result?.text).not.toContain("test-pattern");
  });
});

describe("parseScannableMessages", () => {
  it("JSONLから走査対象メッセージのみ抽出する", () => {
    const jsonl = [
      JSON.stringify({ type: "user", message: { role: "user", content: "msg1" }, timestamp: "2024-06-01T00:00:00Z" }),
      JSON.stringify({ type: "mode", mode: "default" }),
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", content: [{ type: "text", text: "msg2" }] },
        timestamp: "2024-06-01T00:01:00Z",
      }),
      "invalid json line",
      "",
    ].join("\n");

    const messages = parseScannableMessages(jsonl);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toBe("msg1");
    expect(messages[1].text).toBe("msg2");
  });
});

describe("scanMessagesForPatterns", () => {
  it("パターン名が言及されたメッセージ数を数える", () => {
    const patterns = [makePattern()];
    const messages = [
      message("test-patternを使って実装して"),
      message("test-patternに従って実装しました"),
      message("ありがとう"),
    ];

    const result = scanMessagesForPatterns(messages, patterns);
    expect(result.get("id-1")?.count).toBe(2);
  });

  it("大文字小文字を区別しない", () => {
    const patterns = [makePattern({ name: "Read-Before-Edit" })];
    const result = scanMessagesForPatterns([message("read-before-editでお願い")], patterns);
    expect(result.get("id-1")?.count).toBe(1);
  });

  it("日本語パターン名も検出できる", () => {
    const patterns = [makePattern({ name: "エラーログ先行確認" })];
    const result = scanMessagesForPatterns(
      [message("エラーログ先行確認パターンに従い、まずログを見せてください")],
      patterns
    );
    expect(result.get("id-1")?.count).toBe(1);
  });

  it("言及がないパターンは結果に含まれない", () => {
    const patterns = [makePattern()];
    const result = scanMessagesForPatterns([message("関係ない話")], patterns);
    expect(result.has("id-1")).toBe(false);
  });

  it("最新の言及日時を記録する", () => {
    const patterns = [makePattern()];
    const messages = [
      message("test-pattern", "2024-06-01T00:00:00Z"),
      message("test-pattern", "2024-06-02T00:00:00Z"),
    ];

    const result = scanMessagesForPatterns(messages, patterns);
    expect(result.get("id-1")?.lastUsedAt).toBe("2024-06-02T00:00:00Z");
  });

  it("複数パターンを同時に集計できる", () => {
    const patterns = [
      makePattern({ id: "id-1", name: "pattern-a" }),
      makePattern({ id: "id-2", name: "pattern-b" }),
    ];
    const messages = [
      message("pattern-aとpattern-bを両方使って"),
      message("pattern-aを適用しました"),
    ];

    const result = scanMessagesForPatterns(messages, patterns);
    expect(result.get("id-1")?.count).toBe(2);
    expect(result.get("id-2")?.count).toBe(1);
  });
});
