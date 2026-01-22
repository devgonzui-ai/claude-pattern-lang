import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ensureDir,
  readYaml,
  writeYaml,
  fileExists,
  readTextFile,
  writeTextFile,
} from "../../src/utils/fs.js";

describe("fs utilities", () => {
  let testDir: string;

  beforeEach(async () => {
    // 各テスト用の一時ディレクトリを作成
    testDir = join(tmpdir(), `cpl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // テスト後にクリーンアップ
    await rm(testDir, { recursive: true, force: true });
  });

  describe("ensureDir", () => {
    it("ディレクトリを再帰的に作成する", async () => {
      const nestedDir = join(testDir, "a", "b", "c");

      await ensureDir(nestedDir);

      // ディレクトリが存在することを確認
      await expect(access(nestedDir)).resolves.toBeUndefined();
    });

    it("既存のディレクトリに対しても正常に動作する", async () => {
      const existingDir = join(testDir, "existing");
      await mkdir(existingDir);

      // エラーなく完了することを確認
      await expect(ensureDir(existingDir)).resolves.toBeUndefined();
    });
  });

  describe("readYaml", () => {
    it("YAMLファイルを読み込んでパースする", async () => {
      const yamlPath = join(testDir, "test.yaml");
      const content = `
name: テストパターン
type: prompt
items:
  - item1
  - item2
`;
      await writeFile(yamlPath, content, "utf-8");

      const result = await readYaml<{ name: string; type: string; items: string[] }>(yamlPath);

      expect(result).toEqual({
        name: "テストパターン",
        type: "prompt",
        items: ["item1", "item2"],
      });
    });

    it("存在しないファイルの場合はnullを返す", async () => {
      const nonExistentPath = join(testDir, "non-existent.yaml");

      const result = await readYaml(nonExistentPath);

      expect(result).toBeNull();
    });

    it("空のファイルの場合はnullを返す", async () => {
      const emptyPath = join(testDir, "empty.yaml");
      await writeFile(emptyPath, "", "utf-8");

      const result = await readYaml(emptyPath);

      expect(result).toBeNull();
    });
  });

  describe("writeYaml", () => {
    it("オブジェクトをYAMLファイルとして書き込む", async () => {
      const yamlPath = join(testDir, "output.yaml");
      const data = {
        name: "テストパターン",
        type: "solution",
        nested: {
          key: "value",
        },
      };

      await writeYaml(yamlPath, data);

      // ファイルが作成されたことを確認
      await expect(access(yamlPath)).resolves.toBeUndefined();

      // 内容を読み込んで検証
      const readBack = await readYaml<typeof data>(yamlPath);
      expect(readBack).toEqual(data);
    });

    it("必要に応じて親ディレクトリを作成する", async () => {
      const nestedPath = join(testDir, "nested", "dir", "file.yaml");
      const data = { test: true };

      await writeYaml(nestedPath, data);

      const readBack = await readYaml<typeof data>(nestedPath);
      expect(readBack).toEqual(data);
    });
  });

  describe("fileExists", () => {
    it("存在するファイルに対してtrueを返す", async () => {
      const filePath = join(testDir, "exists.txt");
      await writeFile(filePath, "test", "utf-8");

      const result = await fileExists(filePath);

      expect(result).toBe(true);
    });

    it("存在しないファイルに対してfalseを返す", async () => {
      const filePath = join(testDir, "not-exists.txt");

      const result = await fileExists(filePath);

      expect(result).toBe(false);
    });

    it("存在するディレクトリに対してtrueを返す", async () => {
      const result = await fileExists(testDir);

      expect(result).toBe(true);
    });
  });

  describe("readTextFile", () => {
    it("テキストファイルの内容を読み込む", async () => {
      const filePath = join(testDir, "text.txt");
      const content = "これはテストファイルです\n日本語も含みます";
      await writeFile(filePath, content, "utf-8");

      const result = await readTextFile(filePath);

      expect(result).toBe(content);
    });

    it("存在しないファイルの場合はエラーをスローする", async () => {
      const filePath = join(testDir, "not-exists.txt");

      await expect(readTextFile(filePath)).rejects.toThrow();
    });
  });

  describe("writeTextFile", () => {
    it("テキストファイルを書き込む", async () => {
      const filePath = join(testDir, "write.txt");
      const content = "書き込みテスト";

      await writeTextFile(filePath, content);

      const readBack = await readTextFile(filePath);
      expect(readBack).toBe(content);
    });

    it("必要に応じて親ディレクトリを作成する", async () => {
      const nestedPath = join(testDir, "new", "nested", "file.txt");
      const content = "ネストされたパス";

      await writeTextFile(nestedPath, content);

      const readBack = await readTextFile(nestedPath);
      expect(readBack).toBe(content);
    });
  });
});
