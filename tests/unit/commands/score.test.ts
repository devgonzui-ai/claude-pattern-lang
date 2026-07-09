import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreAction } from "../../../src/cli/commands/score.js";
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
  table: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  stringifyError: vi.fn((err: unknown) => String(err)),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.score.emptyCatalog": "Pattern catalog is empty.",
      "messages.score.noSessions": "No sessions found to scan.",
      "messages.score.scanning": `Scanning ${params?.sessions} session(s) for ${params?.patterns} pattern(s)...`,
      "messages.score.summary": `${params?.total} pattern(s) total, ${params?.unused} never used.`,
      "messages.score.pruneHint": "Run `cpl prune --dry-run` to review unused patterns.",
      "messages.score.saved": "Saved usage counts to the pattern catalog.",
      "messages.score.error": `Error: ${params?.error}`,
    };
    return messages[key] || key;
  }),
}));

describe("scoreAction", () => {
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

  it("使用状況をテーブル表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue(mockUsages);

    await scoreAction({});

    expect(scanner.scanPatternUsage).toHaveBeenCalledWith(mockPatterns, mockSessions);
    expect(logger.table).toHaveBeenCalledWith([
      expect.objectContaining({ Name: "used-pattern", Uses: "3", Sessions: "1" }),
      expect.objectContaining({ Name: "unused-pattern", Uses: "0", "Last Used": "-" }),
    ]);
    // 未使用があるのでpruneのヒントを表示
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("prune"));
    // --saveなしでは保存しない
    expect(store.saveCatalog).not.toHaveBeenCalled();
  });

  it("--saveでusage_countをカタログに保存する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue(mockUsages);

    await scoreAction({ save: true });

    expect(store.saveCatalog).toHaveBeenCalledWith({
      patterns: [
        expect.objectContaining({ id: "1", usage_count: 3 }),
        expect.objectContaining({ id: "2", usage_count: 0 }),
      ],
    });
  });

  it("--jsonでJSON出力する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue(mockSessions);
    vi.mocked(scanner.scanPatternUsage).mockResolvedValue(mockUsages);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await scoreAction({ json: true });

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output).toEqual([
      expect.objectContaining({ name: "used-pattern", use_count: 3 }),
      expect.objectContaining({ name: "unused-pattern", use_count: 0, last_used_at: null }),
    ]);
    expect(logger.table).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("カタログが空の場合は警告を表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [] });

    await scoreAction({});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("empty"));
    expect(scanner.scanPatternUsage).not.toHaveBeenCalled();
  });

  it("セッションがない場合は警告を表示する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: mockPatterns });
    vi.mocked(scanner.collectSessionsForScan).mockResolvedValue([]);

    await scoreAction({});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("No sessions"));
    expect(scanner.scanPatternUsage).not.toHaveBeenCalled();
  });
});
