import { describe, it, expect, vi, beforeEach } from "vitest";
import { removeAction } from "../../../src/cli/commands/remove.js";
import * as store from "../../../src/core/catalog/store.js";
import * as logger from "../../../src/utils/logger.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  removePattern: vi.fn(),
  removePatternByIdentifier: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.remove.notFound": `Pattern "${params?.identifier}" not found.`,
      "messages.remove.removed": `Removed pattern "${params?.identifier}".`,
      "messages.remove.ambiguousId": `ID "${params?.identifier}" matches multiple patterns:`,
      "messages.common.ambiguousIdPrefix": `  ${params?.shortId}...  ${params?.name}`,
      "cli.commands.remove.description": "Remove a pattern",
      "cli.commands.remove.argument": "Pattern ID or name",
      "cli.commands.remove.options.name": "Search by name",
    };
    return messages[key] || key;
  }),
}));

describe("removeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パターンを削除する（デフォルト：ID→名前の優先順位）", async () => {
    vi.mocked(store.removePatternByIdentifier).mockResolvedValue(true);

    await removeAction("test-id", {});

    expect(store.removePatternByIdentifier).toHaveBeenCalledWith("test-id");
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Removed"));
  });

  it("--nameオプション時は名前のみで検索して削除する", async () => {
    vi.mocked(store.removePattern).mockResolvedValue(true);

    await removeAction("テストパターン", { name: true });

    expect(store.removePattern).toHaveBeenCalledWith("テストパターン");
    expect(store.removePatternByIdentifier).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Removed"));
  });

  it("パターンが見つからない場合はエラーを表示する", async () => {
    vi.mocked(store.removePatternByIdentifier).mockResolvedValue(false);

    await removeAction("存在しないパターン", {});

    expect(store.removePatternByIdentifier).toHaveBeenCalledWith("存在しないパターン");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("not found"));
  });
});
