import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseClaudeMd,
  writeClaudeMd,
  type ClaudeMdContent,
} from "../../src/core/sync/claude-md.js";
import * as fs from "../../src/utils/fs.js";

// fs.tsのモック
vi.mock("../../src/utils/fs.js", () => ({
  fileExists: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

describe("parseClaudeMd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ファイルが存在しない場合", () => {
    it("空のClaudeMdContentを返す", async () => {
      vi.mocked(fs.fileExists).mockResolvedValue(false);

      const result = await parseClaudeMd("/path/to/CLAUDE.md");

      expect(result).toEqual({
        beforePatterns: "",
        patternsSection: null,
        afterPatterns: "",
      });
    });
  });

  describe("パターンセクションがない場合", () => {
    it("全体をbeforePatternsに格納する", async () => {
      vi.mocked(fs.fileExists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(`# Project

This is a project description.

## Rules

- Rule 1
- Rule 2
`);

      const result = await parseClaudeMd("/path/to/CLAUDE.md");

      expect(result.beforePatterns).toBe(`# Project

This is a project description.

## Rules

- Rule 1
- Rule 2
`);
      expect(result.patternsSection).toBeNull();
      expect(result.afterPatterns).toBe("");
    });
  });

  describe("パターンセクションがある場合", () => {
    it("パターンセクションを正しく抽出する", async () => {
      vi.mocked(fs.fileExists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(`# Project

## Rules

- Rule 1

<!-- CPL:PATTERNS:START -->
## Patterns

### Pattern1
- context: テスト
- solution: 解決策
<!-- CPL:PATTERNS:END -->

## Other Section

Some other content.
`);

      const result = await parseClaudeMd("/path/to/CLAUDE.md");

      expect(result.beforePatterns).toBe(`# Project

## Rules

- Rule 1

`);
      expect(result.patternsSection).toBe(`<!-- CPL:PATTERNS:START -->
## Patterns

### Pattern1
- context: テスト
- solution: 解決策
<!-- CPL:PATTERNS:END -->`);
      expect(result.afterPatterns).toBe(`

## Other Section

Some other content.
`);
    });

    it("パターンセクションがファイル末尾にある場合も正しく処理する", async () => {
      vi.mocked(fs.fileExists).mockResolvedValue(true);
      vi.mocked(fs.readTextFile).mockResolvedValue(`# Project

## Rules

<!-- CPL:PATTERNS:START -->
## Patterns

### Pattern1
- context: テスト
<!-- CPL:PATTERNS:END -->`);

      const result = await parseClaudeMd("/path/to/CLAUDE.md");

      expect(result.beforePatterns).toBe(`# Project

## Rules

`);
      expect(result.patternsSection).toBe(`<!-- CPL:PATTERNS:START -->
## Patterns

### Pattern1
- context: テスト
<!-- CPL:PATTERNS:END -->`);
      expect(result.afterPatterns).toBe("");
    });
  });
});

describe("writeClaudeMd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パターンセクションがnullの場合はbeforePatternsのみ書き込む", async () => {
    const content: ClaudeMdContent = {
      beforePatterns: "# Project\n\nSome content.",
      patternsSection: null,
      afterPatterns: "",
    };

    await writeClaudeMd("/path/to/CLAUDE.md", content);

    expect(fs.writeTextFile).toHaveBeenCalledWith(
      "/path/to/CLAUDE.md",
      "# Project\n\nSome content."
    );
  });

  it("パターンセクションがある場合は結合して書き込む", async () => {
    const content: ClaudeMdContent = {
      beforePatterns: "# Project\n\n",
      patternsSection: "<!-- CPL:PATTERNS:START -->\n## Patterns\n<!-- CPL:PATTERNS:END -->",
      afterPatterns: "\n\n## Other",
    };

    await writeClaudeMd("/path/to/CLAUDE.md", content);

    expect(fs.writeTextFile).toHaveBeenCalledWith(
      "/path/to/CLAUDE.md",
      "# Project\n\n<!-- CPL:PATTERNS:START -->\n## Patterns\n<!-- CPL:PATTERNS:END -->\n\n## Other"
    );
  });
});
