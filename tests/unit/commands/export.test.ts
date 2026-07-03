import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportAction } from "../../../src/cli/commands/export.js";
import * as store from "../../../src/core/catalog/store.js";
import * as fs from "../../../src/utils/fs.js";
import * as logger from "../../../src/utils/logger.js";
import type { Pattern } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  loadCatalog: vi.fn(),
  getPatternByIdentifier: vi.fn(),
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
  stringifyError: vi.fn((err: unknown) => String(err)),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.export.emptyCatalog": "Pattern catalog is empty. Add patterns first.",
      "messages.export.patternNotFound": `Pattern "${params?.id}" not found.`,
      "messages.export.ambiguousId": `ID "${params?.identifier}" matches multiple patterns:`,
      "messages.export.exportingPatterns": `Exporting ${params?.count} pattern(s) as Claude Code Skills...`,
      "messages.export.changeHeader": "=== Generated Skills ===",
      "messages.export.dryRun": "[dry-run] Files were not written.",
      "messages.export.saveConfirm": `Write ${params?.count} skill file(s) to ${params?.dir}?`,
      "messages.export.cancelled": "Export cancelled.",
      "messages.export.fileWritten": `Wrote ${params?.path}.`,
      "messages.export.exported": `Exported ${params?.count} skill(s) to ${params?.dir}.`,
      "messages.export.restartHint": "Please restart Claude Code to load the new skills.",
      "messages.export.error": `Error: ${params?.error}`,
      "messages.common.ambiguousIdPrefix": `  ${params?.shortId}...  ${params?.name}`,
      "cli.commands.export.description": "Export patterns as Claude Code Skills",
      "cli.commands.export.argument": "Pattern IDs to export",
      "cli.commands.export.options.skills": "Export in Claude Code Skills format (default)",
      "cli.commands.export.options.project": "Target project for export",
      "cli.commands.export.options.global": "Export to ~/.claude/skills",
      "cli.commands.export.options.dryRun": "Display generated files only",
      "cli.commands.export.options.force": "Write without confirmation",
    };
    return messages[key] || key;
  }),
}));

describe("exportAction", () => {
  const mockPatterns: Pattern[] = [
    {
      id: "1",
      name: "test-pattern",
      type: "solution",
      context: "テストコンテキスト",
      solution: "テストソリューション",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      name: "another-pattern",
      type: "code",
      context: "別のコンテキスト",
      solution: "別のソリューション",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("全パターンをスキルとして書き込む（force）", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });

    await exportAction([], {
      project: "/test/project",
      force: true,
    });

    expect(store.loadCatalog).toHaveBeenCalled();
    expect(fs.writeTextFile).toHaveBeenCalledTimes(2);
    expect(fs.writeTextFile).toHaveBeenCalledWith(
      "/test/project/.claude/skills/test-pattern/SKILL.md",
      expect.stringContaining("name: test-pattern")
    );
    expect(fs.writeTextFile).toHaveBeenCalledWith(
      "/test/project/.claude/skills/another-pattern/SKILL.md",
      expect.stringContaining("name: another-pattern")
    );
  });

  it("dry-runの場合は書き込まない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });

    await exportAction([], {
      project: "/test/project",
      dryRun: true,
    });

    expect(fs.writeTextFile).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("dry-run"));
  });

  it("パターンが空の場合は警告を表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [] });

    await exportAction([], { project: "/test/project" });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("empty"));
    expect(fs.writeTextFile).not.toHaveBeenCalled();
  });

  it("ID指定で該当パターンのみエクスポートする", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(store.getPatternByIdentifier).mockResolvedValue(mockPatterns[0]);

    await exportAction(["1"], {
      project: "/test/project",
      force: true,
    });

    expect(store.getPatternByIdentifier).toHaveBeenCalledWith("1");
    expect(fs.writeTextFile).toHaveBeenCalledTimes(1);
    expect(fs.writeTextFile).toHaveBeenCalledWith(
      "/test/project/.claude/skills/test-pattern/SKILL.md",
      expect.any(String)
    );
  });

  it("存在しないIDはエラーを表示して中断する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(store.getPatternByIdentifier).mockResolvedValue(null);

    await exportAction(["missing"], {
      project: "/test/project",
      force: true,
    });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("not found"));
    expect(fs.writeTextFile).not.toHaveBeenCalled();
  });
});
