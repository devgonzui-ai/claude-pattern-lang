/**
 * E2E-007: cpl list 正常系
 * E2E-008: cpl list --json
 * E2E-009: cpl list --type prompt
 * E2E-010: cpl list --search keyword
 * EDGE-001: 空のパターンカタログでlist
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestEnvironment, runCli, createMockPattern } from "../helpers/test-helpers.js";

describe("E2E: cpl list", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("E2E-007: 正常系 - パターン一覧をテーブル形式で表示する", async () => {
    // パターンを作成
    const pattern1 = createMockPattern({ name: "エラーハンドリング", type: "prompt" });
    const pattern2 = createMockPattern({ name: "ログ出力パターン", type: "solution" });
    await env.createCatalog([pattern1, pattern2]);

    const result = await runCli(["list"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("エラーハンドリング");
    expect(result.stdout).toContain("ログ出力パターン");
    expect(result.stdout).toContain("prompt");
    expect(result.stdout).toContain("solution");
  });

  it("E2E-008: --json オプション - JSON形式で出力する", async () => {
    const pattern = createMockPattern({ name: "テストパターン", type: "code" });
    await env.createCatalog([pattern]);

    const result = await runCli(["list", "--json"], env);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(Array.isArray(output)).toBe(true);
    expect(output.length).toBe(1);
    expect(output[0].name).toBe("テストパターン");
    expect(output[0].type).toBe("code");
  });

  it("E2E-009: --type オプション - タイプでフィルタリングする", async () => {
    const pattern1 = createMockPattern({ name: "プロンプトパターン", type: "prompt" });
    const pattern2 = createMockPattern({ name: "コードパターン", type: "code" });
    const pattern3 = createMockPattern({ name: "ソリューションパターン", type: "solution" });
    await env.createCatalog([pattern1, pattern2, pattern3]);

    const result = await runCli(["list", "--type", "prompt"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("プロンプトパターン");
    expect(result.stdout).not.toContain("コードパターン");
    expect(result.stdout).not.toContain("ソリューションパターン");
  });

  it("E2E-010: --search オプション - キーワードで検索する", async () => {
    const pattern1 = createMockPattern({
      name: "エラーハンドリング",
      context: "TypeScriptでのエラー処理",
    });
    const pattern2 = createMockPattern({
      name: "ログ出力",
      context: "ログレベルの設定方法",
    });
    await env.createCatalog([pattern1, pattern2]);

    const result = await runCli(["list", "--search", "エラー"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("エラーハンドリング");
    expect(result.stdout).not.toContain("ログ出力");
  });

  it("EDGE-001: 空のパターンカタログ - 適切なメッセージを表示する", async () => {
    await env.createCatalog([]);

    const result = await runCli(["list"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No patterns found");
  });

  it("--type と --search の組み合わせで絞り込む", async () => {
    const pattern1 = createMockPattern({
      name: "エラーハンドリング",
      type: "prompt",
      context: "TypeScriptでのエラー処理",
    });
    const pattern2 = createMockPattern({
      name: "エラーログ",
      type: "solution",
      context: "エラーのログ出力",
    });
    const pattern3 = createMockPattern({
      name: "ログ設定",
      type: "prompt",
      context: "ログレベルの設定",
    });
    await env.createCatalog([pattern1, pattern2, pattern3]);

    const result = await runCli(["list", "--type", "prompt", "--search", "エラー"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("エラーハンドリング");
    expect(result.stdout).not.toContain("エラーログ");
    expect(result.stdout).not.toContain("ログ設定");
  });
});
