/**
 * E2E-001: cpl init 正常系
 * E2E-002: cpl init 重複実行
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { TestEnvironment, runCli } from "../helpers/test-helpers.js";

describe("E2E: cpl init", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("E2E-001: 正常系 - ディレクトリと設定ファイルを作成する", async () => {
    const result = await runCli(["init", "--default"], env);

    // 成功メッセージを確認
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("初期化が完了しました");

    // ディレクトリが作成されたことを確認
    await expect(access(env.patternsDir)).resolves.toBeUndefined();

    // 設定ファイルが作成されたことを確認
    const configPath = join(env.patternsDir, "config.yaml");
    await expect(access(configPath)).resolves.toBeUndefined();

    // 設定ファイルの内容を確認
    const config = await env.readYaml<{ version: number; llm: { provider: string } }>(configPath);
    expect(config).not.toBeNull();
    expect(config!.version).toBe(1);
    expect(config!.llm.provider).toBe("anthropic");

    // カタログファイルが作成されたことを確認
    const catalogPath = join(env.patternsDir, "patterns.yaml");
    await expect(access(catalogPath)).resolves.toBeUndefined();

    // カタログの内容を確認
    const catalog = await env.readCatalog();
    expect(catalog.patterns).toEqual([]);
  });

  it("E2E-002: 重複実行 - 既存設定がある場合は警告を表示する", async () => {
    // 1回目の初期化
    await runCli(["init", "--default"], env);

    // 2回目の初期化
    const result = await runCli(["init", "--default"], env);

    // 警告メッセージを確認
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("既に存在");
  });

  it("次のステップのガイダンスを表示する", async () => {
    const result = await runCli(["init", "--default"], env);

    expect(result.stdout).toContain("次のステップ");
    expect(result.stdout).toContain("ANTHROPIC_API_KEY");
    expect(result.stdout).toContain("cpl analyze");
    expect(result.stdout).toContain("cpl sync");
  });
});
