/**
 * E2E-013: cpl remove <name> 正常系
 * ERR-004: 存在しないパターンのremove
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestEnvironment, runCli, createMockPattern } from "../helpers/test-helpers.js";

describe("E2E: cpl remove", () => {
  let env: TestEnvironment;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.createConfig();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("E2E-013: 正常系 - パターンを削除する", async () => {
    const pattern = createMockPattern({
      name: "削除対象パターン",
      type: "prompt",
    });
    await env.createCatalog([pattern]);

    // 削除前にパターンが存在することを確認
    let catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(1);

    const result = await runCli(["remove", "削除対象パターン"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Removed pattern");
    expect(result.stdout).toContain("削除対象パターン");

    // カタログから削除されたことを確認
    catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(0);
  });

  it("ERR-004: 存在しないパターン - エラーメッセージを表示する", async () => {
    await env.createCatalog([]);

    const result = await runCli(["remove", "存在しないパターン"], env);

    expect(result.exitCode).toBe(0); // エラーでも終了コードは0
    expect(result.output).toContain("not found");
  });

  it("複数パターンがある場合、指定したパターンのみ削除する", async () => {
    const pattern1 = createMockPattern({ name: "パターンA", type: "prompt" });
    const pattern2 = createMockPattern({ name: "パターンB", type: "solution" });
    const pattern3 = createMockPattern({ name: "パターンC", type: "code" });
    await env.createCatalog([pattern1, pattern2, pattern3]);

    const result = await runCli(["remove", "パターンB"], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Removed pattern");

    // パターンBのみ削除され、A, Cは残っている
    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(2);
    const names = catalog.patterns.map((p) => p.name);
    expect(names).toContain("パターンA");
    expect(names).toContain("パターンC");
    expect(names).not.toContain("パターンB");
  });

  it("削除後に同名パターンを再追加できる", async () => {
    const pattern = createMockPattern({
      name: "再追加パターン",
      type: "prompt",
    });
    await env.createCatalog([pattern]);

    // 削除
    await runCli(["remove", "再追加パターン"], env);

    // 再追加（ファイル経由で）
    const { join } = await import("node:path");
    const { writeFile } = await import("node:fs/promises");
    const yaml = await import("js-yaml");
    const newPattern = {
      name: "再追加パターン",
      type: "solution",
      context: "新しいコンテキスト",
      solution: "新しいソリューション",
    };
    const yamlPath = join(env.projectDir, "new-pattern.yaml");
    await writeFile(yamlPath, yaml.dump(newPattern), "utf-8");

    const result = await runCli(["add", "--file", yamlPath], env);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Added pattern");

    const catalog = await env.readCatalog();
    expect(catalog.patterns.length).toBe(1);
    expect(catalog.patterns[0].name).toBe("再追加パターン");
    expect(catalog.patterns[0].type).toBe("solution");
  });
});
