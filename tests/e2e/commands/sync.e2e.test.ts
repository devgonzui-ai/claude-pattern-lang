/**
 * E2E-014: cpl sync 正常系
 * E2E-015: cpl sync --global
 * E2E-016: cpl sync --dry-run
 * E2E-017: cpl sync --force
 * EDGE-002: 空のパターンカタログでsync
 * EDGE-009: 既存CLAUDE.mdへのパターン追記
 * EDGE-010: CLAUDE.md内のパターンセクション更新
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { access } from "node:fs/promises";
import { TestEnvironment, runCli, createMockPattern } from "../helpers/test-helpers.js";

describe("E2E: cpl sync", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("E2E-014: 正常系 - パターンをCLAUDE.mdに同期する", async () => {
    const pattern = createMockPattern({
      name: "テストパターン",
      type: "prompt",
      context: "これはテストコンテキストです",
      solution: "これはテストソリューションです",
    });
    await env.createCatalog([pattern]);

    const result = await runCli(["sync", "--force"], env, {
      input: "y\n",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Synced patterns");

    // CLAUDE.mdが作成されたことを確認
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    await expect(access(claudeMdPath)).resolves.toBeUndefined();

    // CLAUDE.mdに@参照が追加されていることを確認
    const claudeMdContent = await env.readFile(claudeMdPath);
    expect(claudeMdContent).toContain("@.claude/patterns.md");

    // patterns.mdが作成されたことを確認
    const patternsFilePath = join(env.projectDir, ".claude", "patterns.md");
    await expect(access(patternsFilePath)).resolves.toBeUndefined();

    // patterns.mdの内容を確認
    const patternsContent = await env.readFile(patternsFilePath);
    expect(patternsContent).toContain("テストパターン");
    expect(patternsContent).toContain("## Patterns");
  });

  it("E2E-015: --global オプション - グローバルCLAUDE.mdに同期する", async () => {
    const pattern = createMockPattern({
      name: "グローバルパターン",
      type: "solution",
    });
    await env.createCatalog([pattern]);

    const result = await runCli(["sync", "--global", "--force"], env, {
      input: "y\n",
    });

    expect(result.exitCode).toBe(0);

    // グローバルCLAUDE.mdが作成されたことを確認
    const globalClaudeMdPath = join(env.claudeDir, "CLAUDE.md");
    await expect(access(globalClaudeMdPath)).resolves.toBeUndefined();

    // グローバルCLAUDE.mdに@参照が追加されていることを確認
    const claudeMdContent = await env.readFile(globalClaudeMdPath);
    expect(claudeMdContent).toContain("@~/.claude-patterns/patterns.md");

    // グローバルpatterns.mdが作成されたことを確認
    const globalPatternsPath = join(env.patternsDir, "patterns.md");
    await expect(access(globalPatternsPath)).resolves.toBeUndefined();

    // patterns.mdの内容を確認
    const patternsContent = await env.readFile(globalPatternsPath);
    expect(patternsContent).toContain("グローバルパターン");
  });

  it("E2E-016: --dry-run オプション - 変更を保存しない", async () => {
    const pattern = createMockPattern({
      name: "ドライランパターン",
      type: "code",
    });
    await env.createCatalog([pattern]);

    const result = await runCli(["sync", "--dry-run"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("dry-run");
    expect(result.stdout).toContain("ドライランパターン");

    // CLAUDE.mdは作成されていない
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    await expect(access(claudeMdPath)).rejects.toThrow();

    // patterns.mdも作成されていない
    const patternsFilePath = join(env.projectDir, ".claude", "patterns.md");
    await expect(access(patternsFilePath)).rejects.toThrow();
  });

  it("E2E-017: --force オプション - 確認なしで上書き", async () => {
    const pattern = createMockPattern({
      name: "強制同期パターン",
      type: "prompt",
    });
    await env.createCatalog([pattern]);

    // 入力なしで実行（--forceで確認をスキップ）
    const result = await runCli(["sync", "--force"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Synced patterns");
  });

  it("EDGE-002: 空のパターンカタログ - 警告メッセージを表示する", async () => {
    await env.createCatalog([]);

    const result = await runCli(["sync", "--force"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("empty");
  });

  it("EDGE-009: 既存CLAUDE.mdへのパターン追記 - 他のセクションが保持される", async () => {
    // 既存のCLAUDE.mdを作成
    const existingContent = `# Project Guidelines

This is an existing section.

## Development Rules

- Rule 1
- Rule 2

## Notes

Some important notes here.
`;
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    await env.createClaudeMd(claudeMdPath, existingContent);

    const pattern = createMockPattern({
      name: "追記パターン",
      type: "prompt",
    });
    await env.createCatalog([pattern]);

    const result = await runCli(["sync", "--force"], env);

    expect(result.exitCode).toBe(0);

    // 既存のセクションが保持されていることを確認
    const claudeMdContent = await env.readFile(claudeMdPath);
    expect(claudeMdContent).toContain("Project Guidelines");
    expect(claudeMdContent).toContain("This is an existing section");
    expect(claudeMdContent).toContain("Development Rules");
    expect(claudeMdContent).toContain("Rule 1");
    expect(claudeMdContent).toContain("@.claude/patterns.md");

    // patterns.mdにパターンが書き込まれていることを確認
    const patternsFilePath = join(env.projectDir, ".claude", "patterns.md");
    const patternsContent = await env.readFile(patternsFilePath);
    expect(patternsContent).toContain("追記パターン");
  });

  it("EDGE-010: CLAUDE.md内のパターンセクション更新 - 既存パターンセクションの上書き", async () => {
    // 既存のCLAUDE.mdをパターンセクション付きで作成（CPLマーカー付き）
    const existingContent = `# Project Guidelines

Some guidelines.

<!-- CPL:PATTERNS:START -->
@.claude/patterns.md
<!-- CPL:PATTERNS:END -->

# Other Section

Other content.
`;
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    await env.createClaudeMd(claudeMdPath, existingContent);

    const newPattern = createMockPattern({
      name: "新しいパターン",
      type: "solution",
      context: "新しいコンテキスト",
      solution: "新しいソリューション",
    });
    await env.createCatalog([newPattern]);

    const result = await runCli(["sync", "--force"], env);

    expect(result.exitCode).toBe(0);

    const claudeMdContent = await env.readFile(claudeMdPath);
    // @参照が含まれている
    expect(claudeMdContent).toContain("@.claude/patterns.md");
    // 他のセクションは保持されている
    expect(claudeMdContent).toContain("Project Guidelines");
    expect(claudeMdContent).toContain("Other Section");

    // patterns.mdに新しいパターンが含まれている
    const patternsFilePath = join(env.projectDir, ".claude", "patterns.md");
    const patternsContent = await env.readFile(patternsFilePath);
    expect(patternsContent).toContain("新しいパターン");
  });

  it("--project オプション - 特定プロジェクトに同期する", async () => {
    const pattern = createMockPattern({
      name: "プロジェクトパターン",
      type: "code",
    });
    await env.createCatalog([pattern]);

    const targetProject = join(env.baseDir, "target-project");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(targetProject, { recursive: true });

    const result = await runCli(["sync", "--project", targetProject, "--force"], env);

    expect(result.exitCode).toBe(0);

    // 指定プロジェクトにCLAUDE.mdが作成されたことを確認
    const targetClaudeMdPath = join(targetProject, "CLAUDE.md");
    await expect(access(targetClaudeMdPath)).resolves.toBeUndefined();

    // CLAUDE.mdに@参照が追加されていることを確認
    const claudeMdContent = await env.readFile(targetClaudeMdPath);
    expect(claudeMdContent).toContain("@.claude/patterns.md");

    // patterns.mdが作成されたことを確認
    const patternsFilePath = join(targetProject, ".claude", "patterns.md");
    await expect(access(patternsFilePath)).resolves.toBeUndefined();

    // patterns.mdの内容を確認
    const patternsContent = await env.readFile(patternsFilePath);
    expect(patternsContent).toContain("プロジェクトパターン");
  });

  it("複数パターンを同期する", async () => {
    const patterns = [
      createMockPattern({ name: "パターン1", type: "prompt" }),
      createMockPattern({ name: "パターン2", type: "solution" }),
      createMockPattern({ name: "パターン3", type: "code" }),
    ];
    await env.createCatalog(patterns);

    const result = await runCli(["sync", "--force"], env);

    expect(result.exitCode).toBe(0);

    // CLAUDE.mdに@参照が追加されていることを確認
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    const claudeMdContent = await env.readFile(claudeMdPath);
    expect(claudeMdContent).toContain("@.claude/patterns.md");

    // patterns.mdに全パターンが含まれていることを確認
    const patternsFilePath = join(env.projectDir, ".claude", "patterns.md");
    const patternsContent = await env.readFile(patternsFilePath);
    expect(patternsContent).toContain("パターン1");
    expect(patternsContent).toContain("パターン2");
    expect(patternsContent).toContain("パターン3");
  });
});
