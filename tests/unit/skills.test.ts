import { describe, it, expect } from "vitest";
import {
  toSkillName,
  toSkillDescription,
  generateSkillMd,
  buildSkillFiles,
  getSkillsDir,
  SKILL_FOOTER_MARKER,
} from "../../src/core/sync/skills.js";
import type { Pattern } from "../../src/types/index.js";

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: "test-id",
    name: "test-pattern",
    type: "solution",
    context: "テストのコンテキスト",
    solution: "テストのソリューション",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("toSkillName", () => {
  it("英数字とハイフンはそのまま保持する", () => {
    expect(toSkillName("react-form-controlled-components")).toBe(
      "react-form-controlled-components"
    );
  });

  it("大文字は小文字に変換する", () => {
    expect(toSkillName("Read-Before-Edit")).toBe("read-before-edit");
  });

  it("日本語を含む名前を扱える", () => {
    expect(toSkillName("Read-Before-Edit原則")).toBe("read-before-edit原則");
  });

  it("空白や記号はハイフンに置換する", () => {
    expect(toSkillName("型安全な 非同期API/関数")).toBe("型安全な-非同期api-関数");
  });

  it("連続するハイフンは1つにまとめる", () => {
    expect(toSkillName("a  --  b")).toBe("a-b");
  });

  it("先頭・末尾のハイフンは除去する", () => {
    expect(toSkillName("-pattern-")).toBe("pattern");
  });

  it("64文字を超える場合は切り詰める", () => {
    const longName = "a".repeat(100);
    expect(toSkillName(longName).length).toBeLessThanOrEqual(64);
  });

  it("空になった場合はフォールバック名を返す", () => {
    expect(toSkillName("!!!")).toBe("pattern");
  });
});

describe("toSkillDescription", () => {
  it("contextを含む", () => {
    const description = toSkillDescription(makePattern());
    expect(description).toContain("テストのコンテキスト");
  });

  it("problemとタグを含む", () => {
    const description = toSkillDescription(
      makePattern({ problem: "テストの問題", tags: ["react", "form"] })
    );
    expect(description).toContain("テストの問題");
    expect(description).toContain("Keywords: react, form");
  });

  it("改行は空白に正規化される", () => {
    const description = toSkillDescription(
      makePattern({ context: "行1\n行2" })
    );
    expect(description).not.toContain("\n");
    expect(description).toContain("行1 行2");
  });

  it("500文字を超える場合は切り詰める", () => {
    const description = toSkillDescription(
      makePattern({ context: "あ".repeat(1000) })
    );
    expect(description.length).toBeLessThanOrEqual(500);
  });
});

describe("generateSkillMd", () => {
  it("frontmatterにnameとdescriptionを含む", () => {
    const content = generateSkillMd(makePattern());
    expect(content.startsWith("---\n")).toBe(true);
    expect(content).toContain("name: test-pattern");
    expect(content).toContain("description:");
  });

  it("Context・Solutionセクションを含む", () => {
    const content = generateSkillMd(makePattern());
    expect(content).toContain("## Context");
    expect(content).toContain("テストのコンテキスト");
    expect(content).toContain("## Solution");
    expect(content).toContain("テストのソリューション");
  });

  it("problemがある場合はProblemセクションを含む", () => {
    const content = generateSkillMd(makePattern({ problem: "テストの問題" }));
    expect(content).toContain("## Problem");
    expect(content).toContain("テストの問題");
  });

  it("problemがない場合はProblemセクションを含まない", () => {
    const content = generateSkillMd(makePattern());
    expect(content).not.toContain("## Problem");
  });

  it("exampleはコードブロックで囲む", () => {
    const content = generateSkillMd(
      makePattern({ example: "const x = 1;" })
    );
    expect(content).toContain("## Example");
    expect(content).toContain("```\nconst x = 1;\n```");
  });

  it("example_promptがある場合はExample Promptセクションを含む", () => {
    const content = generateSkillMd(
      makePattern({ type: "prompt", example_prompt: "エラーログを見せて" })
    );
    expect(content).toContain("## Example Prompt");
    expect(content).toContain("エラーログを見せて");
  });

  it("タグと関連パターンを含む", () => {
    const content = generateSkillMd(
      makePattern({ tags: ["a", "b"], related: ["other-pattern"] })
    );
    expect(content).toContain("**Tags**: a, b");
    expect(content).toContain("**Related**: other-pattern");
  });

  it("生成マーカーを含む", () => {
    const content = generateSkillMd(makePattern());
    expect(content).toContain(SKILL_FOOTER_MARKER);
  });

  it("descriptionに特殊文字があってもYAMLとして安全", () => {
    const content = generateSkillMd(
      makePattern({ context: 'これは "引用" と: コロンを含む' })
    );
    // frontmatterが壊れずに閉じられている
    const parts = content.split("---");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getSkillsDir", () => {
  it("projectオプションでプロジェクト配下のパスを返す", () => {
    expect(getSkillsDir({ project: "/test/project" })).toBe(
      "/test/project/.claude/skills"
    );
  });

  it("globalオプションでホーム配下のパスを返す", () => {
    expect(getSkillsDir({ global: true })).toContain(".claude/skills");
    expect(getSkillsDir({ global: true })).not.toContain("undefined");
  });

  it("オプションなしはカレントディレクトリ配下のパスを返す", () => {
    expect(getSkillsDir({})).toBe(`${process.cwd()}/.claude/skills`);
  });
});

describe("buildSkillFiles", () => {
  it("パターンごとにSKILL.mdのパスとコンテンツを生成する", () => {
    const files = buildSkillFiles(
      [makePattern({ name: "pattern-a" }), makePattern({ name: "pattern-b" })],
      "/test/.claude/skills"
    );
    expect(files).toHaveLength(2);
    expect(files[0].filePath).toBe("/test/.claude/skills/pattern-a/SKILL.md");
    expect(files[1].filePath).toBe("/test/.claude/skills/pattern-b/SKILL.md");
    expect(files[0].content).toContain("name: pattern-a");
  });

  it("スキル名が重複する場合は連番を付与する", () => {
    const files = buildSkillFiles(
      [
        makePattern({ id: "1", name: "Same Name" }),
        makePattern({ id: "2", name: "same name" }),
      ],
      "/test/.claude/skills"
    );
    expect(files[0].skillName).toBe("same-name");
    expect(files[1].skillName).toBe("same-name-2");
  });
});
