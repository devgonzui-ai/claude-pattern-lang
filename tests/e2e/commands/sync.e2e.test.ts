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
    expect(result.stdout).toContain("同期しました");

    // CLAUDE.mdが作成されたことを確認
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    await expect(access(claudeMdPath)).resolves.toBeUndefined();

    // 内容を確認
    const content = await env.readFile(claudeMdPath);
    expect(content).toContain("テストパターン");
    expect(content).toContain("# Patterns");
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

    const content = await env.readFile(globalClaudeMdPath);
    expect(content).toContain("グローバルパターン");
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
    expect(result.stdout).toContain("同期しました");
  });

  it("EDGE-002: 空のパターンカタログ - 警告メッセージを表示する", async () => {
    await env.createCatalog([]);

    const result = await runCli(["sync", "--force"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("空です");
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
    const content = await env.readFile(claudeMdPath);
    expect(content).toContain("Project Guidelines");
    expect(content).toContain("This is an existing section");
    expect(content).toContain("Development Rules");
    expect(content).toContain("Rule 1");
    expect(content).toContain("追記パターン");
  });

  it("EDGE-010: CLAUDE.md内のパターンセクション更新 - 既存パターンセクションの上書き", async () => {
    // 既存のCLAUDE.mdをパターンセクション付きで作成
    const existingContent = `# Project Guidelines

Some guidelines.

# Patterns

## Old Pattern
Old pattern content.

## Another Old Pattern
Another old content.

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

    const content = await env.readFile(claudeMdPath);
    // 新しいパターンが含まれている
    expect(content).toContain("新しいパターン");
    // 他のセクションは保持されている
    expect(content).toContain("Project Guidelines");
    expect(content).toContain("Other Section");
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

    const content = await env.readFile(targetClaudeMdPath);
    expect(content).toContain("プロジェクトパターン");
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

    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    const content = await env.readFile(claudeMdPath);
    expect(content).toContain("パターン1");
    expect(content).toContain("パターン2");
    expect(content).toContain("パターン3");
  });
});
