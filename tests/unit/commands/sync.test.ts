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
  getPatternByIdentifier: vi.fn(),
}));

vi.mock("../../../src/core/sync/claude-md.js", () => ({
  parseClaudeMd: vi.fn(),
  writeClaudeMd: vi.fn(),
}));

vi.mock("../../../src/core/sync/merger.js", () => ({
  generatePatternFileContent: vi.fn(),
  generatePatternReference: vi.fn(),
}));

vi.mock("../../../src/utils/fs.js", () => ({
  fileExists: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.sync.emptyCatalog": "Pattern catalog is empty. Add patterns first.",
      "messages.sync.patternNotFound": `Pattern "${params?.id}" not found.`,
      "messages.sync.ambiguousId": `ID "${params?.identifier}" matches multiple patterns:`,
      "messages.sync.syncingPatterns": `Syncing ${params?.count} pattern(s)...`,
      "messages.sync.changeHeader": "=== Changes ===",
      "messages.sync.dryRun": "[dry-run] Changes were not saved.",
      "messages.sync.createConfirm": `${params?.path} does not exist. Create it?`,
      "messages.sync.saveConfirm": "Save changes?",
      "messages.sync.cancelled": "Sync cancelled.",
      "messages.sync.synced": `Synced patterns to ${params?.path}.`,
      "messages.sync.error": `Error: ${params?.error}`,
      "messages.common.ambiguousIdPrefix": `  ${params?.shortId}...  ${params?.name}`,
      "cli.commands.sync.description": "Sync pattern catalog to CLAUDE.md",
      "cli.commands.sync.argument": "Pattern IDs to sync",
      "cli.commands.sync.options.project": "Target project for sync",
      "cli.commands.sync.options.global": "Sync to ~/.claude/CLAUDE.md",
      "cli.commands.sync.options.dryRun": "Display changes only",
      "cli.commands.sync.options.force": "Overwrite without confirmation",
    };
    return messages[key] || key;
  }),
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
    vi.mocked(merger.generatePatternFileContent).mockReturnValue("## Patterns\n...");
    vi.mocked(merger.generatePatternReference).mockReturnValue("<!-- CPL:PATTERNS:START -->\n@.claude/patterns.md\n<!-- CPL:PATTERNS:END -->");

    await syncAction([], {
      project: "/test/project",
      dryRun: true,
    });

    expect(store.loadCatalog).toHaveBeenCalled();
    expect(claudeMd.parseClaudeMd).toHaveBeenCalled();
    expect(merger.generatePatternFileContent).toHaveBeenCalledWith(mockPatterns);
    expect(merger.generatePatternReference).toHaveBeenCalledWith(".claude/patterns.md");
    // dry-runなので書き込まない
    expect(claudeMd.writeClaudeMd).not.toHaveBeenCalled();
    expect(fs.writeTextFile).not.toHaveBeenCalled();
  });

  it("パターンが空の場合は警告を表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [] });

    await syncAction([], { project: "/test/project" });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("empty"));
  });
});
