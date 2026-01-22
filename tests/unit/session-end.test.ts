import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// homeディレクトリをモック
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: vi.fn(),
  };
});

import { homedir } from "node:os";
import {
  handleSessionEnd,
  addToQueue,
  getQueuePath,
  loadQueue,
  saveQueue,
} from "../../src/cli/hooks/session-end.js";
import type { AnalysisQueue } from "../../src/types/index.js";

describe("hooks/session-end", () => {
  let testDir: string;
  let patternsDir: string;
  let queuePath: string;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `cpl-session-end-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    patternsDir = join(testDir, ".claude-patterns");
    queuePath = join(patternsDir, "queue.yaml");
    await mkdir(patternsDir, { recursive: true });

    // homedirをモック
    vi.mocked(homedir).mockReturnValue(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe("getQueuePath", () => {
    it("キューファイルのパスを返す", () => {
      const result = getQueuePath();
      expect(result).toBe(queuePath);
    });
  });

  describe("loadQueue", () => {
    it("キューファイルが存在しない場合、空のキューを返す", async () => {
      const queue = await loadQueue();

      expect(queue).toEqual({ items: [] });
    });

    it("キューファイルが存在する場合、内容を読み込む", async () => {
      const existingQueue: AnalysisQueue = {
        items: [
          {
            session_id: "existing-session",
            project: "/some/project",
            added_at: "2024-01-01T00:00:00Z",
          },
        ],
      };
      await writeFile(
        queuePath,
        `items:\n  - session_id: existing-session\n    project: /some/project\n    added_at: "2024-01-01T00:00:00Z"\n`,
        "utf-8"
      );

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(1);
      expect(queue.items[0].session_id).toBe("existing-session");
    });
  });

  describe("saveQueue", () => {
    it("キューをYAMLファイルとして保存する", async () => {
      const queue: AnalysisQueue = {
        items: [
          {
            session_id: "test-session",
            project: "/test/project",
            added_at: "2024-01-01T12:00:00Z",
          },
        ],
      };

      await saveQueue(queue);

      const content = await readFile(queuePath, "utf-8");
      expect(content).toContain("test-session");
      expect(content).toContain("/test/project");
    });
  });

  describe("addToQueue", () => {
    it("新しいセッションをキューに追加する", async () => {
      await addToQueue("new-session-123", "/my/project");

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(1);
      expect(queue.items[0].session_id).toBe("new-session-123");
      expect(queue.items[0].project).toBe("/my/project");
      expect(queue.items[0].added_at).toBeDefined();
    });

    it("既存のキューにセッションを追加する", async () => {
      // 既存キューを作成
      const existingQueue: AnalysisQueue = {
        items: [
          {
            session_id: "existing-session",
            project: "/existing/project",
            added_at: "2024-01-01T00:00:00Z",
          },
        ],
      };
      await saveQueue(existingQueue);

      await addToQueue("new-session", "/new/project");

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(2);
      expect(queue.items[0].session_id).toBe("existing-session");
      expect(queue.items[1].session_id).toBe("new-session");
    });

    it("同じセッションIDが既に存在する場合、重複追加しない", async () => {
      const existingQueue: AnalysisQueue = {
        items: [
          {
            session_id: "same-session",
            project: "/some/project",
            added_at: "2024-01-01T00:00:00Z",
          },
        ],
      };
      await saveQueue(existingQueue);

      await addToQueue("same-session", "/some/project");

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(1);
    });

    it("ディレクトリが存在しない場合も動作する", async () => {
      // patternsディレクトリを削除
      await rm(patternsDir, { recursive: true });

      await addToQueue("new-session", "/some/project");

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(1);
    });
  });

  describe("handleSessionEnd", () => {
    it("環境変数からセッションIDとプロジェクトパスを取得してキューに追加", async () => {
      // 環境変数を設定
      process.env.CLAUDE_SESSION_ID = "env-session-id";
      process.env.CLAUDE_PROJECT_PATH = "/env/project/path";

      await handleSessionEnd();

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(1);
      expect(queue.items[0].session_id).toBe("env-session-id");
      expect(queue.items[0].project).toBe("/env/project/path");

      // クリーンアップ
      delete process.env.CLAUDE_SESSION_ID;
      delete process.env.CLAUDE_PROJECT_PATH;
    });

    it("セッションIDがない場合は何もしない", async () => {
      delete process.env.CLAUDE_SESSION_ID;
      process.env.CLAUDE_PROJECT_PATH = "/some/path";

      await handleSessionEnd();

      const queue = await loadQueue();

      expect(queue.items).toHaveLength(0);

      delete process.env.CLAUDE_PROJECT_PATH;
    });

    it("100ms以内で完了する（パフォーマンス要件）", async () => {
      process.env.CLAUDE_SESSION_ID = "perf-test-session";
      process.env.CLAUDE_PROJECT_PATH = "/perf/test";

      const start = performance.now();
      await handleSessionEnd();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);

      delete process.env.CLAUDE_SESSION_ID;
      delete process.env.CLAUDE_PROJECT_PATH;
    });
  });
});
