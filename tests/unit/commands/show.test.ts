import { describe, it, expect, vi, beforeEach } from "vitest";
import { showAction } from "../../../src/cli/commands/show.js";
import * as store from "../../../src/core/catalog/store.js";
import * as logger from "../../../src/utils/logger.js";
import type { Pattern } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  getPattern: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  error: vi.fn(),
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

  it("指定したパターンの詳細をYAML形式で表示する", async () => {
    vi.mocked(store.getPattern).mockResolvedValue(mockPattern);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await showAction("テストパターン");

    expect(store.getPattern).toHaveBeenCalledWith("テストパターン");
    expect(consoleSpy).toHaveBeenCalled();
    // YAML形式で出力されていることを確認
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("name: テストパターン");
    expect(output).toContain("type: prompt");
    expect(output).toContain("context: テストコンテキスト");
    consoleSpy.mockRestore();
  });

  it("パターンが見つからない場合はエラーを表示する", async () => {
    vi.mocked(store.getPattern).mockResolvedValue(null);

    await showAction("存在しないパターン");

    expect(store.getPattern).toHaveBeenCalledWith("存在しないパターン");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("見つかりません")
    );
  });
});
