import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseSessionLog,
  listSessions,
  getSessionInfo,
  filterSessionsByDate,
  filterSessionsByProject,
} from "../../src/core/analyzer/session-parser.js";
import type { SessionEntry } from "../../src/types/index.js";
import * as fs from "../../src/utils/fs.js";
import { homedir } from "node:os";

// Mock fs module
vi.mock("../../src/utils/fs.js", () => ({
  readTextFile: vi.fn(),
  fileExists: vi.fn(),
}));

// Mock homedir
vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

// Mock fs/promises for directory listing
vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
}));

describe("session-parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("parseSessionLog", () => {
    it("should parse valid JSONL file with user entries", async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":"Hello"},"timestamp":"2024-01-01T00:00:00Z"}
{"type":"assistant","message":{"role":"assistant","content":"Hi there!"},"timestamp":"2024-01-01T00:00:01Z"}`;

      vi.mocked(fs.readTextFile).mockResolvedValue(jsonlContent);

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        type: "user",
        message: { role: "user", content: "Hello" },
        timestamp: "2024-01-01T00:00:00Z",
      });
      expect(entries[1]).toEqual({
        type: "assistant",
        message: { role: "assistant", content: "Hi there!" },
        timestamp: "2024-01-01T00:00:01Z",
      });
    });

    it("should parse tool_use entries", async () => {
      const jsonlContent = `{"type":"tool_use","tool_name":"Read","tool_input":{"file_path":"/test.ts"},"timestamp":"2024-01-01T00:00:00Z"}`;

      vi.mocked(fs.readTextFile).mockResolvedValue(jsonlContent);

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        type: "tool_use",
        tool_name: "Read",
        tool_input: { file_path: "/test.ts" },
        timestamp: "2024-01-01T00:00:00Z",
      });
    });

    it("should parse tool_result entries", async () => {
      const jsonlContent = `{"type":"tool_result","tool_name":"Read","output":"file content","timestamp":"2024-01-01T00:00:00Z"}`;

      vi.mocked(fs.readTextFile).mockResolvedValue(jsonlContent);

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        type: "tool_result",
        tool_name: "Read",
        output: "file content",
        timestamp: "2024-01-01T00:00:00Z",
      });
    });

    it("should skip invalid JSON lines", async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":"Hello"},"timestamp":"2024-01-01T00:00:00Z"}
invalid json line
{"type":"assistant","message":{"role":"assistant","content":"Hi"},"timestamp":"2024-01-01T00:00:01Z"}`;

      vi.mocked(fs.readTextFile).mockResolvedValue(jsonlContent);

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toHaveLength(2);
    });

    it("should skip empty lines", async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":"Hello"},"timestamp":"2024-01-01T00:00:00Z"}

{"type":"assistant","message":{"role":"assistant","content":"Hi"},"timestamp":"2024-01-01T00:00:01Z"}`;

      vi.mocked(fs.readTextFile).mockResolvedValue(jsonlContent);

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toHaveLength(2);
    });

    it("should skip entries with unknown type", async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":"Hello"},"timestamp":"2024-01-01T00:00:00Z"}
{"type":"unknown_type","data":"test"}
{"type":"assistant","message":{"role":"assistant","content":"Hi"},"timestamp":"2024-01-01T00:00:01Z"}`;

      vi.mocked(fs.readTextFile).mockResolvedValue(jsonlContent);

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toHaveLength(2);
    });

    it("should return empty array for empty file", async () => {
      vi.mocked(fs.readTextFile).mockResolvedValue("");

      const entries = await parseSessionLog("/path/to/session.jsonl");

      expect(entries).toEqual([]);
    });

    it("should throw error when file does not exist", async () => {
      vi.mocked(fs.readTextFile).mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );

      await expect(parseSessionLog("/nonexistent.jsonl")).rejects.toThrow();
    });
  });

  describe("getSessionInfo", () => {
    it("should extract session info from path", () => {
      const sessionPath =
        "/home/testuser/.claude/projects/-home-user-myproject/abc123.jsonl";

      const info = getSessionInfo(sessionPath);

      expect(info).toEqual({
        id: "abc123",
        project: "-home-user-myproject",
        path: sessionPath,
      });
    });

    it("should handle complex project paths", () => {
      const sessionPath =
        "/home/testuser/.claude/projects/-home-testuser-work-my-project/session-xyz.jsonl";

      const info = getSessionInfo(sessionPath);

      expect(info).toEqual({
        id: "session-xyz",
        project: "-home-testuser-work-my-project",
        path: sessionPath,
      });
    });
  });

  describe("filterSessionsByDate", () => {
    const sessions = [
      { id: "1", project: "proj", path: "/p/1.jsonl", timestamp: "2024-01-15T10:00:00Z" },
      { id: "2", project: "proj", path: "/p/2.jsonl", timestamp: "2024-01-20T10:00:00Z" },
      { id: "3", project: "proj", path: "/p/3.jsonl", timestamp: "2024-01-25T10:00:00Z" },
    ];

    it("should filter sessions since specified date", () => {
      const filtered = filterSessionsByDate(sessions, "2024-01-18");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(["2", "3"]);
    });

    it("should return all sessions when date is before all", () => {
      const filtered = filterSessionsByDate(sessions, "2024-01-01");

      expect(filtered).toHaveLength(3);
    });

    it("should return empty when date is after all", () => {
      const filtered = filterSessionsByDate(sessions, "2024-02-01");

      expect(filtered).toHaveLength(0);
    });
  });

  describe("filterSessionsByProject", () => {
    const sessions = [
      { id: "1", project: "-home-user-project-a", path: "/p/1.jsonl" },
      { id: "2", project: "-home-user-project-b", path: "/p/2.jsonl" },
      { id: "3", project: "-home-user-project-a", path: "/p/3.jsonl" },
    ];

    it("should filter sessions by project path (encoded)", () => {
      const filtered = filterSessionsByProject(sessions, "-home-user-project-a");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(["1", "3"]);
    });

    it("should filter sessions by original project path", () => {
      const filtered = filterSessionsByProject(sessions, "/home/user/project-a");

      expect(filtered).toHaveLength(2);
    });

    it("should return empty for non-matching project", () => {
      const filtered = filterSessionsByProject(sessions, "-home-user-project-c");

      expect(filtered).toHaveLength(0);
    });
  });
});
