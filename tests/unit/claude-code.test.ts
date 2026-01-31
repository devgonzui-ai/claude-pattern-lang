import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClaudeCodeClient, isClaudeCodeAvailable } from "../../src/llm/providers/claude-code.js";

// child_processをモック
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";

describe("claude-code provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isClaudeCodeAvailable", () => {
    it("Claude Code CLIが利用可能な場合、trueを返す", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
          return mockProcess;
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      const result = await isClaudeCodeAvailable();
      expect(result).toBe(true);
    });

    it("Claude Code CLIが利用不可の場合、falseを返す", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(1), 10);
          }
          return mockProcess;
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      const result = await isClaudeCodeAvailable();
      expect(result).toBe(false);
    });

    it("エラーが発生した場合、falseを返す", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "error") {
            setTimeout(() => callback(new Error("spawn error")), 10);
          }
          return mockProcess;
        }),
        kill: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      const result = await isClaudeCodeAvailable();
      expect(result).toBe(false);
    });
  });

  describe("createClaudeCodeClient", () => {
    it("LLMClientインターフェースを実装したオブジェクトを返す", () => {
      const result = createClaudeCodeClient();
      expect(result).toBeDefined();
      expect(result.client).toBeDefined();
      expect(typeof result.client.complete).toBe("function");
      expect(result.extractor).toBeDefined();
    });
  });
});
