import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncAction } from "../../../src/cli/commands/sync.js";
import * as store from "../../../src/core/catalog/store.js";
import * as claudeMd from "../../../src/core/sync/claude-md.js";
import * as merger from "../../../src/core/sync/merger.js";
import * as fs from "../../../src/utils/fs.js";
import * as logger from "../../../src/utils/logger.js";
import type { Pattern } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  loadCatalog: vi.fn(),
}));

vi.mock("../../../src/core/sync/claude-md.js", () => ({
  parseClaudeMd: vi.fn(),
  writeClaudeMd: vi.fn(),
}));

vi.mock("../../../src/core/sync/merger.js", () => ({
  generatePatternsSection: vi.fn(),
  mergePatternsSections: vi.fn(),
}));

vi.mock("../../../src/utils/fs.js", () => ({
  fileExists: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

describe("syncAction", () => {
  const mockPatterns: Pattern[] = [
    {
      id: "1",
      name: "テストパターン",
      type: "prompt",
      context: "テストコンテキスト",
      solution: "テストソリューション",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CLAUDE.mdにパターンを同期する（dry-run）", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(fs.fileExists).mockResolvedValue(true);
    vi.mocked(claudeMd.parseClaudeMd).mockResolvedValue({
      beforePatterns: "# Project\n\n",
      patternsSection: null,
      afterPatterns: "",
    });
    vi.mocked(merger.generatePatternsSection).mockReturnValue("## Patterns\n...");
    vi.mocked(merger.mergePatternsSections).mockReturnValue("## Patterns\n...");

    await syncAction({
      project: "/test/project",
      dryRun: true,
    });

    expect(store.loadCatalog).toHaveBeenCalled();
    expect(claudeMd.parseClaudeMd).toHaveBeenCalled();
    expect(merger.generatePatternsSection).toHaveBeenCalledWith(mockPatterns);
    // dry-runなので書き込まない
    expect(claudeMd.writeClaudeMd).not.toHaveBeenCalled();
  });

  it("パターンが空の場合は警告を表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [] });

    await syncAction({ project: "/test/project" });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("パターン"));
  });
});
