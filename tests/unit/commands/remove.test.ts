import { describe, it, expect, vi, beforeEach } from "vitest";
import { removeAction } from "../../../src/cli/commands/remove.js";
import * as store from "../../../src/core/catalog/store.js";
import * as logger from "../../../src/utils/logger.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  removePattern: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  success: vi.fn(),
  error: vi.fn(),
}));

describe("removeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パターンを削除する", async () => {
    vi.mocked(store.removePattern).mockResolvedValue(true);

    await removeAction("テストパターン");

    expect(store.removePattern).toHaveBeenCalledWith("テストパターン");
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("削除しました"));
  });

  it("パターンが見つからない場合はエラーを表示する", async () => {
    vi.mocked(store.removePattern).mockResolvedValue(false);

    await removeAction("存在しないパターン");

    expect(store.removePattern).toHaveBeenCalledWith("存在しないパターン");
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("見つかりません"));
  });
});
