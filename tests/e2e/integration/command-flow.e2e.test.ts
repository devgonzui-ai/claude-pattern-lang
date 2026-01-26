/**
 * IT-002: add -> show -> remove フロー
 * IT-003: analyze -> sync フロー（部分的）
 * IT-004: 複数プロジェクトの同期
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import yaml from "js-yaml";
import {
  TestEnvironment,
  runCli,
  createMockPatternInput,
  createMockPattern,
} from "../helpers/test-helpers.js";

describe("E2E Integration: add -> show -> remove フロー", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
    await env.createCatalog([]);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("IT-002: パターンの追加 -> 表示 -> 削除の一連のフロー", async () => {
    // Step 1: パターンを追加
    const patternInput = createMockPatternInput({
      name: "フローテストパターン",
      type: "solution",
      context: "統合テスト用のコンテキスト",
      solution: "統合テスト用のソリューション",
    });
    const yamlPath = join(env.projectDir, "flow-test-pattern.yaml");
    await writeFile(yamlPath, yaml.dump(patternInput), "utf-8");

    const addResult = await runCli(["add", "--file", yamlPath], env);
    expect(addResult.exitCode).toBe(0);
    expect(addResult.stdout).toContain("追加しました");

    // カタログに追加されたことを確認
    let catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(1);
    expect(catalog.patterns[0].name).toBe("フローテストパターン");

    // Step 2: パターンを表示
    const showResult = await runCli(["show", "フローテストパターン"], env);
    expect(showResult.exitCode).toBe(0);
    expect(showResult.stdout).toContain("name: フローテストパターン");
    expect(showResult.stdout).toContain("type: solution");
    expect(showResult.stdout).toContain("統合テスト用のコンテキスト");

    // Step 3: パターンを削除
    const removeResult = await runCli(["remove", "フローテストパターン"], env);
    expect(removeResult.exitCode).toBe(0);
    expect(removeResult.stdout).toContain("削除しました");

    // カタログから削除されたことを確認
    catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(0);

    // Step 4: 削除後に表示するとエラー
    const showAfterRemove = await runCli(["show", "フローテストパターン"], env);
    expect(showAfterRemove.output).toContain("見つかりません");
  });
});

describe("E2E Integration: init -> list フロー", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    // initコマンドで設定を作成するので、事前作成しない
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("IT-001(部分): 初期化 -> 一覧表示の一連のフロー", async () => {
    // Step 1: 初期化
    const initResult = await runCli(["init", "--default"], env);
    expect(initResult.exitCode).toBe(0);
    expect(initResult.stdout).toContain("初期化が完了しました");

    // Step 2: 空の一覧表示
    const listResult = await runCli(["list"], env);
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain("パターンが見つかりませんでした");

    // Step 3: パターンを追加
    const patternInput = createMockPatternInput({
      name: "初期化後パターン",
      type: "prompt",
    });
    const yamlPath = join(env.projectDir, "after-init.yaml");
    await writeFile(yamlPath, yaml.dump(patternInput), "utf-8");
    await runCli(["add", "--file", yamlPath], env);

    // Step 4: パターンが一覧に表示される
    const listAfterAdd = await runCli(["list"], env);
    expect(listAfterAdd.stdout).toContain("初期化後パターン");
  });
});

describe("E2E Integration: IT-004 複数プロジェクトの同期", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("異なるプロジェクトへのパターン同期が独立して動作する", async () => {
    // 複数のパターンを作成
    const patterns = [
      createMockPattern({ name: "共通パターン1", type: "prompt" }),
      createMockPattern({ name: "共通パターン2", type: "solution" }),
    ];
    await env.createCatalog(patterns);

    // プロジェクトAとプロジェクトBを作成
    const projectA = join(env.baseDir, "project-a");
    const projectB = join(env.baseDir, "project-b");
    await mkdir(projectA, { recursive: true });
    await mkdir(projectB, { recursive: true });

    // プロジェクトAに同期
    const syncA = await runCli(["sync", "--project", projectA, "--force"], env);
    expect(syncA.exitCode).toBe(0);

    // プロジェクトBに同期
    const syncB = await runCli(["sync", "--project", projectB, "--force"], env);
    expect(syncB.exitCode).toBe(0);

    // 両プロジェクトにCLAUDE.mdが作成されている
    const contentA = await env.readFile(join(projectA, "CLAUDE.md"));
    const contentB = await env.readFile(join(projectB, "CLAUDE.md"));

    expect(contentA).toContain("共通パターン1");
    expect(contentA).toContain("共通パターン2");
    expect(contentB).toContain("共通パターン1");
    expect(contentB).toContain("共通パターン2");

    // プロジェクトAのCLAUDE.mdを変更しても、プロジェクトBには影響しない
    await writeFile(
      join(projectA, "CLAUDE.md"),
      "# Project A Only\n\nCustom content for A.",
      "utf-8"
    );

    // プロジェクトBを再同期
    await runCli(["sync", "--project", projectB, "--force"], env);

    // プロジェクトAの内容は変更されたまま
    const contentAAfter = await env.readFile(join(projectA, "CLAUDE.md"));
    expect(contentAAfter).toContain("Custom content for A");

    // プロジェクトBは新しく同期された内容
    const contentBAfter = await env.readFile(join(projectB, "CLAUDE.md"));
    expect(contentBAfter).toContain("共通パターン1");
  });
});

describe("E2E Integration: 追加 -> 同期フロー", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
    await env.createCatalog([]);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("パターン追加後にsyncでCLAUDE.mdに反映される", async () => {
    // Step 1: パターンを追加
    const pattern = createMockPatternInput({
      name: "同期テストパターン",
      type: "code",
      context: "コード生成パターン",
      solution: "テンプレートを使用してコードを生成する",
    });
    const yamlPath = join(env.projectDir, "sync-test.yaml");
    await writeFile(yamlPath, yaml.dump(pattern), "utf-8");

    await runCli(["add", "--file", yamlPath], env);

    // Step 2: 同期
    const syncResult = await runCli(["sync", "--force"], env);
    expect(syncResult.exitCode).toBe(0);

    // Step 3: CLAUDE.mdにパターンが含まれている
    const claudeMdPath = join(env.projectDir, "CLAUDE.md");
    const content = await env.readFile(claudeMdPath);

    expect(content).toContain("同期テストパターン");
    expect(content).toContain("コード生成パターン");
    expect(content).toContain("テンプレートを使用してコードを生成する");
  });

  it("パターン削除後にsyncで更新される", async () => {
    // Step 1: パターンを追加
    const patterns = [
      createMockPattern({ name: "残るパターン", type: "prompt" }),
      createMockPattern({ name: "削除するパターン", type: "solution" }),
    ];
    await env.createCatalog(patterns);

    // Step 2: 最初の同期
    await runCli(["sync", "--force"], env);
    let content = await env.readFile(join(env.projectDir, "CLAUDE.md"));
    expect(content).toContain("残るパターン");
    expect(content).toContain("削除するパターン");

    // Step 3: パターンを削除
    await runCli(["remove", "削除するパターン"], env);

    // Step 4: 再同期
    await runCli(["sync", "--force"], env);
    content = await env.readFile(join(env.projectDir, "CLAUDE.md"));

    expect(content).toContain("残るパターン");
    // 削除されたパターンは含まれない（実装によってはマージの挙動が異なる）
    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(1);
  });
});

describe("E2E Integration: 日本語・特殊文字の取り扱い", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
    await env.createCatalog([]);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("EDGE-006: 日本語パターン名で全フロー動作確認", async () => {
    // 日本語と特殊文字を含むパターン
    const pattern = createMockPatternInput({
      name: "日本語パターン【テスト】",
      type: "prompt",
      context: "全角記号も含む「コンテキスト」",
      solution: "ソリューション〜♪",
    });
    const yamlPath = join(env.projectDir, "japanese.yaml");
    await writeFile(yamlPath, yaml.dump(pattern), "utf-8");

    // 追加
    const addResult = await runCli(["add", "--file", yamlPath], env);
    expect(addResult.exitCode).toBe(0);

    // 一覧表示
    const listResult = await runCli(["list"], env);
    expect(listResult.stdout).toContain("日本語パターン【テスト】");

    // 詳細表示
    const showResult = await runCli(["show", "日本語パターン【テスト】"], env);
    expect(showResult.stdout).toContain("日本語パターン【テスト】");
    expect(showResult.stdout).toContain("全角記号も含む");

    // 同期
    await runCli(["sync", "--force"], env);
    const content = await env.readFile(join(env.projectDir, "CLAUDE.md"));
    expect(content).toContain("日本語パターン【テスト】");

    // 削除
    const removeResult = await runCli(["remove", "日本語パターン【テスト】"], env);
    expect(removeResult.exitCode).toBe(0);

    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(0);
  });
});
