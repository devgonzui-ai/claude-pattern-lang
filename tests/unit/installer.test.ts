import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  installHooks,
  uninstallHooks,
  isHooksInstalled,
  getClaudeSettingsPath,
} from "../../src/hooks/installer.js";

// homeディレクトリをモック
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: vi.fn(),
  };
});

import { homedir } from "node:os";

describe("hooks/installer", () => {
  let testDir: string;
  let claudeDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `cpl-installer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    claudeDir = join(testDir, ".claude");
    settingsPath = join(claudeDir, "settings.json");
    await mkdir(claudeDir, { recursive: true });

    // homedirをモック
    vi.mocked(homedir).mockReturnValue(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe("getClaudeSettingsPath", () => {
    it("Claude Code設定ファイルのパスを返す", () => {
      const result = getClaudeSettingsPath();
      expect(result).toBe(settingsPath);
    });
  });

  describe("installHooks", () => {
    it("settings.jsonが存在しない場合、フック設定を含む新規ファイルを作成する", async () => {
      await installHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.SessionEnd).toBeDefined();
      expect(settings.hooks.SessionEnd).toContain("cpl");
    });

    it("settings.jsonが存在する場合、既存設定を保持しつつフック設定を追加する", async () => {
      const existingSettings = {
        someExistingKey: "existingValue",
        anotherSetting: { nested: true },
      };
      await writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));

      await installHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // 既存設定が保持されている
      expect(settings.someExistingKey).toBe("existingValue");
      expect(settings.anotherSetting).toEqual({ nested: true });
      // フック設定が追加されている
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.SessionEnd).toContain("cpl");
    });

    it("既存のhooks設定がある場合、マージする", async () => {
      const existingSettings = {
        hooks: {
          SomeOtherHook: "existing-command",
        },
      };
      await writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));

      await installHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // 既存のフック設定が保持されている
      expect(settings.hooks.SomeOtherHook).toBe("existing-command");
      // SessionEndフックが追加されている
      expect(settings.hooks.SessionEnd).toContain("cpl");
    });

    it("既にSessionEndフックが設定されている場合、上書きしない", async () => {
      const existingSettings = {
        hooks: {
          SessionEnd: "existing-session-end-hook",
        },
      };
      await writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));

      await installHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // 既存のSessionEndフックが保持されている
      expect(settings.hooks.SessionEnd).toBe("existing-session-end-hook");
    });

    it(".claudeディレクトリが存在しない場合、作成する", async () => {
      // .claudeディレクトリを削除
      await rm(claudeDir, { recursive: true });

      await installHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      expect(settings.hooks).toBeDefined();
    });
  });

  describe("uninstallHooks", () => {
    it("SessionEndフック設定を削除する", async () => {
      const existingSettings = {
        someKey: "value",
        hooks: {
          SessionEnd: "cpl _hook-session-end",
          OtherHook: "other-command",
        },
      };
      await writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));

      await uninstallHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // SessionEndフックが削除されている
      expect(settings.hooks.SessionEnd).toBeUndefined();
      // 他のフックと設定は保持されている
      expect(settings.hooks.OtherHook).toBe("other-command");
      expect(settings.someKey).toBe("value");
    });

    it("settings.jsonが存在しない場合、何もしない", async () => {
      // エラーが発生しないことを確認
      await expect(uninstallHooks()).resolves.toBeUndefined();
    });

    it("hooksが空になった場合、hooksキーを削除する", async () => {
      const existingSettings = {
        someKey: "value",
        hooks: {
          SessionEnd: "cpl _hook-session-end",
        },
      };
      await writeFile(settingsPath, JSON.stringify(existingSettings, null, 2));

      await uninstallHooks();

      const content = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(content);

      // hooksキー自体が削除されている
      expect(settings.hooks).toBeUndefined();
      // 他の設定は保持されている
      expect(settings.someKey).toBe("value");
    });
  });

  describe("isHooksInstalled", () => {
    it("SessionEndフックが設定されている場合、trueを返す", async () => {
      const settings = {
        hooks: {
          SessionEnd: "cpl _hook-session-end",
        },
      };
      await writeFile(settingsPath, JSON.stringify(settings, null, 2));

      const result = await isHooksInstalled();

      expect(result).toBe(true);
    });

    it("SessionEndフックが設定されていない場合、falseを返す", async () => {
      const settings = {
        hooks: {
          OtherHook: "other-command",
        },
      };
      await writeFile(settingsPath, JSON.stringify(settings, null, 2));

      const result = await isHooksInstalled();

      expect(result).toBe(false);
    });

    it("hooksが存在しない場合、falseを返す", async () => {
      const settings = {
        someKey: "value",
      };
      await writeFile(settingsPath, JSON.stringify(settings, null, 2));

      const result = await isHooksInstalled();

      expect(result).toBe(false);
    });

    it("settings.jsonが存在しない場合、falseを返す", async () => {
      const result = await isHooksInstalled();

      expect(result).toBe(false);
    });
  });
});
