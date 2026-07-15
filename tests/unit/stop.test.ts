import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleStop, getSessionLogPath } from "../../src/cli/hooks/stop.js";
import * as sessionEnd from "../../src/cli/hooks/session-end.js";
import * as sessionParser from "../../src/core/analyzer/session-parser.js";
import * as extractor from "../../src/core/analyzer/pattern-extractor.js";
import * as store from "../../src/core/catalog/store.js";
import * as claudeMd from "../../src/core/sync/claude-md.js";
import * as fs from "../../src/utils/fs.js";
import type { Config, QueueItem } from "../../src/types/index.js";
import { DEFAULT_CONFIG } from "../../src/types/config.js";

// モック
vi.mock("../../src/cli/hooks/session-end.js", () => ({
  loadQueue: vi.fn(),
  saveQueue: vi.fn(),
}));

vi.mock("../../src/core/analyzer/session-parser.js", async (importOriginal) => {
  const actual = await importOriginal<typeof sessionParser>();
  return {
    ...actual,
    parseSessionLog: vi.fn(),
  };
});

vi.mock("../../src/core/analyzer/pattern-extractor.js", () => ({
  extractPatterns: vi.fn(),
}));

vi.mock("../../src/core/catalog/store.js", () => ({
  loadCatalog: vi.fn(),
  addPattern: vi.fn(),
}));

vi.mock("../../src/core/sync/claude-md.js", () => ({
  parseClaudeMd: vi.fn(),
  writeClaudeMd: vi.fn(),
}));

vi.mock("../../src/utils/fs.js", async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    fileExists: vi.fn(),
    readYaml: vi.fn(),
    writeTextFile: vi.fn(),
  };
});

const autoAnalyzeConfig: Config = {
  ...DEFAULT_CONFIG,
  analysis: {
    ...DEFAULT_CONFIG.analysis,
    auto_analyze: true,
    min_session_length: 2,
  },
};

const queueItem: QueueItem = {
  session_id: "session-1",
  project: "/home/user/project",
  added_at: "2026-01-01T00:00:00Z",
};

const entries = [
  { type: "user", message: { role: "user", content: "hello" }, timestamp: "t" },
  { type: "assistant", message: { role: "assistant", content: "hi" }, timestamp: "t" },
] as never[];

const extractedPattern = {
  name: "new-pattern",
  type: "solution" as const,
  context: "context",
  solution: "solution",
};

describe("getSessionLogPath", () => {
  it("プロジェクトパスとセッションIDからログパスを構築する", () => {
    const path = getSessionLogPath(queueItem);
    expect(path).toContain("-home-user-project");
    expect(path).toContain("session-1.jsonl");
  });
});

describe("handleStop", () => {
  const originalSessionId = process.env.CLAUDE_SESSION_ID;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CLAUDE_SESSION_ID;
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // デフォルト: 設定ファイル・ログファイルは存在する
    vi.mocked(fs.fileExists).mockResolvedValue(true);
    vi.mocked(fs.readYaml).mockResolvedValue(autoAnalyzeConfig);
    vi.mocked(sessionEnd.loadQueue).mockResolvedValue({ items: [{ ...queueItem }] });
    vi.mocked(sessionParser.parseSessionLog).mockResolvedValue(entries);
    vi.mocked(extractor.extractPatterns).mockResolvedValue([extractedPattern]);
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [] });
    vi.mocked(claudeMd.parseClaudeMd).mockResolvedValue({
      beforePatterns: "",
      patternsSection: null,
      afterPatterns: "",
    });
  });

  afterEach(() => {
    if (originalSessionId !== undefined) {
      process.env.CLAUDE_SESSION_ID = originalSessionId;
    } else {
      delete process.env.CLAUDE_SESSION_ID;
    }
    consoleErrorSpy.mockRestore();
  });

  it("auto_analyzeが無効なら何もしない", async () => {
    vi.mocked(fs.readYaml).mockResolvedValue({
      ...autoAnalyzeConfig,
      analysis: { ...autoAnalyzeConfig.analysis, auto_analyze: false },
    });

    await handleStop();

    expect(sessionEnd.loadQueue).not.toHaveBeenCalled();
  });

  it("設定ファイルがない場合は何もしない", async () => {
    vi.mocked(fs.fileExists).mockResolvedValue(false);

    await handleStop();

    expect(sessionEnd.loadQueue).not.toHaveBeenCalled();
  });

  it("キューが空なら何もしない", async () => {
    vi.mocked(sessionEnd.loadQueue).mockResolvedValue({ items: [] });

    await handleStop();

    expect(extractor.extractPatterns).not.toHaveBeenCalled();
    expect(sessionEnd.saveQueue).not.toHaveBeenCalled();
  });

  it("キューのセッションを解析してパターンを保存し、キューから削除する", async () => {
    await handleStop();

    expect(extractor.extractPatterns).toHaveBeenCalledTimes(1);
    expect(store.addPattern).toHaveBeenCalledWith(extractedPattern);
    expect(sessionEnd.saveQueue).toHaveBeenCalledWith({ items: [] });
  });

  it("現在進行中のセッションは解析しない", async () => {
    process.env.CLAUDE_SESSION_ID = "session-1";

    await handleStop();

    expect(extractor.extractPatterns).not.toHaveBeenCalled();
    expect(sessionEnd.saveQueue).not.toHaveBeenCalled();
  });

  it("min_session_length未満のセッションは解析せずキューから削除する", async () => {
    vi.mocked(sessionParser.parseSessionLog).mockResolvedValue([entries[0]]);

    await handleStop();

    expect(extractor.extractPatterns).not.toHaveBeenCalled();
    expect(sessionEnd.saveQueue).toHaveBeenCalledWith({ items: [] });
  });

  it("auto_syncが有効ならプロジェクトへ自動syncする", async () => {
    vi.mocked(fs.readYaml).mockResolvedValue({
      ...autoAnalyzeConfig,
      sync: { ...autoAnalyzeConfig.sync, auto_sync: true },
    });
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [
        {
          id: "1",
          name: "p",
          type: "solution",
          context: "c",
          solution: "s",
          created_at: "t",
          updated_at: "t",
        },
      ],
    });

    await handleStop();

    expect(fs.writeTextFile).toHaveBeenCalledWith(
      expect.stringContaining("patterns.md"),
      expect.any(String)
    );
    expect(claudeMd.writeClaudeMd).toHaveBeenCalledWith(
      expect.stringContaining("CLAUDE.md"),
      expect.any(Object)
    );
  });

  it("auto_syncが無効ならsyncしない", async () => {
    await handleStop();

    expect(claudeMd.writeClaudeMd).not.toHaveBeenCalled();
  });

  it("解析でエラーが起きてもクラッシュせずキューから削除する", async () => {
    vi.mocked(extractor.extractPatterns).mockRejectedValue(new Error("LLM error"));

    await expect(handleStop()).resolves.toBeUndefined();

    expect(sessionEnd.saveQueue).toHaveBeenCalledWith({ items: [] });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("1回の実行で処理するのは最大3件まで", async () => {
    const items: QueueItem[] = Array.from({ length: 5 }, (_, i) => ({
      session_id: `session-${i}`,
      project: "/home/user/project",
      added_at: "2026-01-01T00:00:00Z",
    }));
    vi.mocked(sessionEnd.loadQueue).mockResolvedValue({ items });

    await handleStop();

    expect(extractor.extractPatterns).toHaveBeenCalledTimes(3);
    const saved = vi.mocked(sessionEnd.saveQueue).mock.calls[0][0];
    expect(saved.items).toHaveLength(2);
  });
});
