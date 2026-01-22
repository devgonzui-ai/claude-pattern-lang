import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractPatterns,
  formatSessionContent,
  findDuplicatePatterns,
} from "../../src/core/analyzer/pattern-extractor.js";
import type { SessionEntry, PatternInput, Pattern } from "../../src/types/index.js";
import * as llmClient from "../../src/llm/client.js";
import * as sanitizer from "../../src/utils/sanitizer.js";

// Mock LLM client module
vi.mock("../../src/llm/client.js", () => ({
  createLLMClient: vi.fn(),
}));

// Mock sanitizer module
vi.mock("../../src/utils/sanitizer.js", () => ({
  sanitize: vi.fn((text: string) => text),
}));

describe("pattern-extractor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatSessionContent", () => {
    it("should format user and assistant entries", () => {
      const entries: SessionEntry[] = [
        {
          type: "user",
          message: { role: "user", content: "Hello" },
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          type: "assistant",
          message: { role: "assistant", content: "Hi there!" },
          timestamp: "2024-01-01T00:00:01Z",
        },
      ];

      const formatted = formatSessionContent(entries);

      expect(formatted).toContain("[user]");
      expect(formatted).toContain("Hello");
      expect(formatted).toContain("[assistant]");
      expect(formatted).toContain("Hi there!");
    });

    it("should format tool_use entries", () => {
      const entries: SessionEntry[] = [
        {
          type: "tool_use",
          tool_name: "Read",
          tool_input: { file_path: "/test.ts" },
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const formatted = formatSessionContent(entries);

      expect(formatted).toContain("[tool_use: Read]");
      expect(formatted).toContain("file_path");
    });

    it("should format tool_result entries (truncated)", () => {
      const entries: SessionEntry[] = [
        {
          type: "tool_result",
          tool_name: "Read",
          output: "a".repeat(600),
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const formatted = formatSessionContent(entries);

      expect(formatted).toContain("[tool_result: Read]");
      expect(formatted).toContain("...");
      expect(formatted.length).toBeLessThan(1000);
    });

    it("should return empty string for empty entries", () => {
      const formatted = formatSessionContent([]);

      expect(formatted).toBe("");
    });
  });

  describe("findDuplicatePatterns", () => {
    const existingPatterns: Pattern[] = [
      {
        id: "1",
        name: "existing-pattern",
        type: "prompt",
        context: "context",
        solution: "solution",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      {
        id: "2",
        name: "another-pattern",
        type: "solution",
        context: "context",
        solution: "solution",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ];

    it("should find patterns with matching names", () => {
      const newPatterns: PatternInput[] = [
        { name: "existing-pattern", type: "prompt", context: "c", solution: "s" },
        { name: "new-pattern", type: "code", context: "c", solution: "s" },
      ];

      const duplicates = findDuplicatePatterns(newPatterns, existingPatterns);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].name).toBe("existing-pattern");
    });

    it("should return empty array when no duplicates", () => {
      const newPatterns: PatternInput[] = [
        { name: "brand-new", type: "prompt", context: "c", solution: "s" },
      ];

      const duplicates = findDuplicatePatterns(newPatterns, existingPatterns);

      expect(duplicates).toHaveLength(0);
    });

    it("should handle case-insensitive matching", () => {
      const newPatterns: PatternInput[] = [
        { name: "Existing-Pattern", type: "prompt", context: "c", solution: "s" },
      ];

      const duplicates = findDuplicatePatterns(newPatterns, existingPatterns);

      expect(duplicates).toHaveLength(1);
    });
  });

  describe("extractPatterns", () => {
    it("should extract patterns using LLM", async () => {
      const mockClient = {
        complete: vi.fn().mockResolvedValue(`
\`\`\`yaml
patterns:
  - name: test-pattern
    type: prompt
    context: Test context
    solution: Test solution
\`\`\`
        `),
      };
      vi.mocked(llmClient.createLLMClient).mockResolvedValue(mockClient);
      vi.mocked(sanitizer.sanitize).mockImplementation((text) => text);

      const entries: SessionEntry[] = [
        {
          type: "user",
          message: { role: "user", content: "Test message" },
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const llmConfig = {
        provider: "anthropic" as const,
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      };

      const patterns = await extractPatterns(entries, [], llmConfig);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe("test-pattern");
      expect(patterns[0].type).toBe("prompt");
      expect(mockClient.complete).toHaveBeenCalled();
    });

    it("should sanitize session content before sending to LLM", async () => {
      const mockClient = {
        complete: vi.fn().mockResolvedValue(`
\`\`\`yaml
patterns: []
\`\`\`
        `),
      };
      vi.mocked(llmClient.createLLMClient).mockResolvedValue(mockClient);

      const entries: SessionEntry[] = [
        {
          type: "user",
          message: { role: "user", content: "api_key=secret123" },
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const llmConfig = {
        provider: "anthropic" as const,
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      };

      await extractPatterns(entries, [], llmConfig);

      expect(sanitizer.sanitize).toHaveBeenCalled();
    });

    it("should filter out duplicate patterns", async () => {
      const mockClient = {
        complete: vi.fn().mockResolvedValue(`
\`\`\`yaml
patterns:
  - name: existing-pattern
    type: prompt
    context: ctx
    solution: sol
  - name: new-pattern
    type: code
    context: ctx
    solution: sol
\`\`\`
        `),
      };
      vi.mocked(llmClient.createLLMClient).mockResolvedValue(mockClient);
      vi.mocked(sanitizer.sanitize).mockImplementation((text) => text);

      const existingPatterns: Pattern[] = [
        {
          id: "1",
          name: "existing-pattern",
          type: "prompt",
          context: "c",
          solution: "s",
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ];

      const entries: SessionEntry[] = [
        {
          type: "user",
          message: { role: "user", content: "Test" },
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const llmConfig = {
        provider: "anthropic" as const,
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      };

      const patterns = await extractPatterns(entries, existingPatterns, llmConfig);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe("new-pattern");
    });

    it("should return empty array for empty entries", async () => {
      const llmConfig = {
        provider: "anthropic" as const,
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      };

      const patterns = await extractPatterns([], [], llmConfig);

      expect(patterns).toHaveLength(0);
      expect(llmClient.createLLMClient).not.toHaveBeenCalled();
    });

    it("should return empty array when LLM returns no patterns", async () => {
      const mockClient = {
        complete: vi.fn().mockResolvedValue(`
\`\`\`yaml
patterns: []
\`\`\`
        `),
      };
      vi.mocked(llmClient.createLLMClient).mockResolvedValue(mockClient);
      vi.mocked(sanitizer.sanitize).mockImplementation((text) => text);

      const entries: SessionEntry[] = [
        {
          type: "user",
          message: { role: "user", content: "Test" },
          timestamp: "2024-01-01T00:00:00Z",
        },
      ];

      const llmConfig = {
        provider: "anthropic" as const,
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      };

      const patterns = await extractPatterns(entries, [], llmConfig);

      expect(patterns).toHaveLength(0);
    });
  });
});
