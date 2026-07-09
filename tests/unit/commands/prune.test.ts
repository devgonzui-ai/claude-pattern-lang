import { describe, it, expect, vi, beforeEach } from "vitest";
import { pruneAction } from "../../../src/cli/commands/prune.js";
import * as store from "../../../src/core/catalog/store.js";
import * as scanner from "../../../src/core/analyzer/usage-scanner.js";
import * as logger from "../../../src/utils/logger.js";
import type { Pattern } from "../../../src/types/index.js";
import type { PatternUsage } from "../../../src/core/analyzer/usage-scanner.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  loadCatalog: vi.fn(),
  saveCatalog: vi.fn(),
}));

vi.mock("../../../src/core/analyzer/usage-scanner.js", async (importOriginal) => {
  const actual = await importOriginal<typeof scanner>();
  return {
    ...actual,
    collectSessionsForScan: vi.fn(),
    scanPatternUsage: vi.fn(),
  };
});

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
      "messages.prune.emptyCatalog": "Pattern catalog is empty. Nothing to prune.",
      "messages.prune.noSessions": "No sessions found to scan.",
      "messages.prune.invalidMinUses": "--min-uses must be a positive integer.",
      "messages.prune.scanning": `Scanning ${params?.sessions} session(s)...`,
      "messages.prune.nothingToPrune": `No patterns with fewer than ${params?.minUses} use(s).`,
      "messages.prune.candidates": `${params?.count} pattern(s) used fewer than ${params?.minUses} time(s):`,
      "messages.prune.candidateItem": `  ${params?.shortId}...  ${params?.name} (uses: ${params?.uses})`,
      "messages.prune.dryRun": "[dry-run] Patterns were not removed.",
      "messages.prune.confirm": `Remove these ${params?.count} pattern(s) from the catalog?`,
      "messages.prune.cancelled": "Prune cancelled.",
      "messages.prune.pruned": `Removed ${params?.count} pattern(s) from the catalog.`,
      "messages.prune.resyncHint": "Run `cpl sync` / `cpl export` to update synced files.",
      "messages.prune.error": `Error: ${params?.error}`,
    };
    return messages[key] || key;
  }),
}));

describe("pruneAction", () => {
  const mockPatterns: Pattern[] = [
    {
      id: "1",
      name: "used-pattern",
      type: "solution",
      context: "コンテキスト",
      solution: "ソリューション",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      name: "unused-pattern",
      type: "code",
      context: "コンテキスト",
      solution: "ソリューション",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];

  const mockSessions = [
    { id: "s1", project: "-test", path: "/tmp/s1.jsonl", timestamp: "2024-06-01T00:00:00Z" },
  ];

  const mockUsages: PatternUsage[] = [
    { pattern: mockPatterns[0], useCount: 3, sessionCount: 1, lastUsedAt: "2024-06-01T00:00:00Z" },
    { pattern: mockPatterns[1], useCount: 0, sessionCount: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未使用パターンを削除する（force）", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [...mockPatterns] });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue(mockUsages);

    await pruneAction({ force: true });

    expect(store.saveCatalog).toHaveBeenCalledWith({
      patterns: [expect.objectContaining({ id: "1", name: "used-pattern" })],
    });
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Removed 1"));
  });

  it("dry-runでは削除しない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [...mockPatterns] });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue(mockUsages);

    await pruneAction({ dryRun: true });

    expect(store.saveCatalog).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("dry-run"));
    // 候補は表示される
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("unused-pattern"));
  });

  it("--min-usesで閾値を変更できる", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [...mockPatterns] });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue(mockUsages);

    // useCount 3 も 5回未満なので両方削除対象
    await pruneAction({ minUses: "5", force: true });

    expect(store.saveCatalog).toHaveBeenCalledWith({ patterns: [] });
  });

  it("不正な--min-usesはエラーを表示する", async () => {
    await pruneAction({ minUses: "abc" });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("positive integer"));
    expect(store.loadCatalog).not.toHaveBeenCalled();
  });

  it("削除対象がなければ何もしない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [mockPatterns[0]] });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue([mockUsages[0]]);

    await pruneAction({ force: true });

    expect(store.saveCatalog).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("No patterns with fewer than"));
  });

  it("カタログが空の場合は警告を表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [] });

    await pruneAction({});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("empty"));
    expect(store.saveCatalog).not.toHaveBeenCalled();
  });

  it("セッションがない場合は警告を表示して削除しない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [...mockPatterns] });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue([]);

    await pruneAction({ force: true });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No sessions"));
    expect(store.saveCatalog).not.toHaveBeenCalled();
  });
});
