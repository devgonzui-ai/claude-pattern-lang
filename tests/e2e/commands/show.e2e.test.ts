/**
 * E2E-011: cpl show <name> 正常系
 * ERR-003: 存在しないパターンのshow
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestEnvironment, runCli, createMockPattern } from "../helpers/test-helpers.js";

describe("E2E: cpl show", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("E2E-011: 正常系 - パターン詳細をYAML形式で表示する", async () => {
    const pattern = createMockPattern({
      name: "エラーハンドリング",
      type: "prompt",
      context: "TypeScriptでのカスタムエラークラスの作成",
      solution: "カスタムエラークラスを継承してエラーを分類する",
    });
    await env.createCatalog([pattern]);

    const result = await runCli(["show", "エラーハンドリング"], env);

    expect(result.exitCode).toBe(0);
    // YAML形式で出力されることを確認
    expect(result.stdout).toContain("name: エラーハンドリング");
    expect(result.stdout).toContain("type: prompt");
    expect(result.stdout).toContain("context:");
    expect(result.stdout).toContain("solution:");
    expect(result.stdout).toContain("id:");
    expect(result.stdout).toContain("created_at:");
  });

  it("ERR-003: 存在しないパターン - エラーメッセージを表示する", async () => {
    await env.createCatalog([]);

    const result = await runCli(["show", "存在しないパターン"], env);

    expect(result.exitCode).toBe(0); // エラーでも終了コードは0
    expect(result.output).toContain("見つかりません");
  });

  it("複数パターンがある場合も正しいパターンを表示する", async () => {
    const pattern1 = createMockPattern({
      name: "パターンA",
      type: "prompt",
      context: "コンテキストA",
    });
    const pattern2 = createMockPattern({
      name: "パターンB",
      type: "solution",
      context: "コンテキストB",
    });
    await env.createCatalog([pattern1, pattern2]);

    const result = await runCli(["show", "パターンB"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("name: パターンB");
    expect(result.stdout).toContain("type: solution");
    expect(result.stdout).toContain("コンテキストB");
    expect(result.stdout).not.toContain("パターンA");
  });
});
