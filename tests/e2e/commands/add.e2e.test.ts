/**
 * E2E-012: cpl add <file> 正常系
 * ERR-002: 不正なYAMLファイルのadd
 * EDGE-007: パターン名重複時のadd
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TestEnvironment,
  runCli,
  createMockPatternInput,
  createMockPattern,
  createPatternYamlFile,
  createInvalidYamlFile,
} from "../helpers/test-helpers.js";

describe("E2E: cpl add", () => {
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

  it("E2E-012: 正常系 - YAMLファイルからパターンを追加する", async () => {
    const patternInput = createMockPatternInput({
      name: "新規パターン",
      type: "prompt",
      context: "テストコンテキスト",
      solution: "テストソリューション",
    });
    const yamlPath = await createPatternYamlFile(env.projectDir, "pattern.yaml", patternInput);

    const result = await runCli(["add", "--file", yamlPath], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Added pattern");
    expect(result.stdout).toContain("新規パターン");

    // カタログに追加されたことを確認
    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(1);
    expect(catalog.patterns[0].name).toBe("新規パターン");
    expect(catalog.patterns[0].type).toBe("prompt");
    expect(catalog.patterns[0].id).toBeDefined();
    expect(catalog.patterns[0].created_at).toBeDefined();
  });

  it("ERR-002: 不正なYAML構文 - エラーメッセージを表示する", async () => {
    const invalidYaml = `
name: テスト
type: prompt
context: [これは不正なYAML
  - 閉じ括弧がない
`;
    const yamlPath = await createInvalidYamlFile(env.projectDir, "invalid.yaml", invalidYaml);

    const result = await runCli(["add", "--file", yamlPath], env);

    // YAMLパースエラーが発生することを確認（未処理例外として表示される）
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("YAMLException");

    // カタログは変更されていない
    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(0);
  });

  it("Validation error - 必須フィールドが欠落している場合", async () => {
    const incompletePattern = {
      name: "不完全なパターン",
      // type, context, solution が欠落
    };
    const yamlPath = await createPatternYamlFile(
      env.projectDir,
      "incomplete.yaml",
      incompletePattern as any
    );

    const result = await runCli(["add", "--file", yamlPath], env);

    expect(result.output).toContain("Validation error");

    // カタログは変更されていない
    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(0);
  });

  it("不正なタイプ - type が規定値以外の場合", async () => {
    const invalidType = {
      name: "不正タイプパターン",
      type: "invalid",
      context: "テストコンテキスト",
      solution: "テストソリューション",
    };
    const yamlPath = await createPatternYamlFile(
      env.projectDir,
      "invalid-type.yaml",
      invalidType as any
    );

    const result = await runCli(["add", "--file", yamlPath], env);

    expect(result.output).toContain("Validation error");
  });

  it("EDGE-007: パターン名重複 - 同名パターンが追加される（現在の実装では許可）", async () => {
    // 既存パターンを追加
    const existingPattern = createMockPattern({
      name: "重複パターン",
      type: "prompt",
    });
    await env.createCatalog([existingPattern]);

    // 同名の新しいパターンを追加
    const newPatternInput = createMockPatternInput({
      name: "重複パターン",
      type: "solution",
      context: "新しいコンテキスト",
      solution: "新しいソリューション",
    });
    const yamlPath = await createPatternYamlFile(env.projectDir, "duplicate.yaml", newPatternInput);

    const result = await runCli(["add", "--file", yamlPath], env);

    // 現在の実装では重複が許可される
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Added pattern");

    // カタログに2つのパターンが存在
    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(2);
    // 両方同じ名前だが異なるID
    const names = catalog.patterns.map((p) => p.name);
    expect(names.filter((n) => n === "重複パターン").length).toBe(2);
  });

  it("存在しないファイル - エラーメッセージを表示する", async () => {
    const result = await runCli(["add", "--file", "/nonexistent/path.yaml"], env);

    expect(result.output).toContain("Could not read");
  });

  it("全タイプのパターンを追加できる", async () => {
    const types = ["prompt", "solution", "code"] as const;

    for (const type of types) {
      await env.createCatalog([]);
      const patternInput = createMockPatternInput({
        name: `${type}パターン`,
        type,
      });
      const yamlPath = await createPatternYamlFile(env.projectDir, `${type}.yaml`, patternInput);

      const result = await runCli(["add", "--file", yamlPath], env);

      expect(result.exitCode).toBe(0);
      const catalog = await env.readCatalog();
      expect(catalog.patterns[0].type).toBe(type);
    }
  });
});
