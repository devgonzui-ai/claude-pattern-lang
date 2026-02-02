import { describe, it, expect, vi, beforeEach } from "vitest";
import { showAction } from "../../../src/cli/commands/show.js";
import * as store from "../../../src/core/catalog/store.js";
import * as logger from "../../../src/utils/logger.js";
import type { Pattern } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  getPattern: vi.fn(),
  getPatternByIdentifier: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.show.notFound": `Pattern "${params?.identifier}" not found.`,
      "messages.show.ambiguousId": `ID "${params?.identifier}" matches multiple patterns:`,
      "messages.common.ambiguousIdPrefix": `  ${params?.shortId}...  ${params?.name}`,
    };
    return messages[key] || key;
  }),
}));

describe("showAction", () => {
  const mockPattern: Pattern = {
    id: "test-id",
    name: "テストパターン",
    type: "prompt",
    context: "テストコンテキスト",
    solution: "テストソリューション",
    problem: "テスト問題",
    example: "テスト例",
    tags: ["tag1", "tag2"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("指定したパターンの詳細をYAML形式で表示する（デフォルト：ID→名前の優先順位）", async () => {
    vi.mocked(store.getPatternByIdentifier).mockResolvedValue(mockPattern);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await showAction("test-id", {});

    expect(store.getPatternByIdentifier).toHaveBeenCalledWith("test-id");
    expect(consoleSpy).toHaveBeenCalled();
    // YAML形式で出力されていることを確認
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("name: テストパターン");
    expect(output).toContain("type: prompt");
    expect(output).toContain("context: テストコンテキスト");
    consoleSpy.mockRestore();
  });

  it("--nameオプション時は名前のみで検索する", async () => {
    vi.mocked(store.getPattern).mockResolvedValue(mockPattern);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await showAction("テストパターン", { name: true });

    expect(store.getPattern).toHaveBeenCalledWith("テストパターン");
    expect(store.getPatternByIdentifier).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("パターンが見つからない場合はエラーを表示する", async () => {
    vi.mocked(store.getPatternByIdentifier).mockResolvedValue(null);

    await showAction("存在しないパターン", {});

    expect(store.getPatternByIdentifier).toHaveBeenCalledWith("存在しないパターン");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("not found")
    );
  });
});
