import { describe, it, expect, vi, beforeEach } from "vitest";
import { initAction } from "../../../src/cli/commands/init.js";
import * as fs from "../../../src/utils/fs.js";
import * as logger from "../../../src/utils/logger.js";

// モック
vi.mock("../../../src/utils/fs.js", () => ({
  ensureDir: vi.fn(),
  fileExists: vi.fn(),
  writeYaml: vi.fn(),
  getPatternsDir: vi.fn(() => "/home/test/.claude-patterns"),
  getConfigPath: vi.fn(() => "/home/test/.claude-patterns/config.yaml"),
  getCatalogPath: vi.fn(() => "/home/test/.claude-patterns/patterns.yaml"),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

describe("initAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ディレクトリと設定ファイルを作成する", async () => {
    vi.mocked(fs.fileExists).mockResolvedValue(false);

    await initAction({ default: true });

    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeYaml).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalled();
  });

  it("既存の設定がある場合は警告を表示する", async () => {
    vi.mocked(fs.fileExists).mockResolvedValue(true);

    await initAction();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("既に"));
  });
});
