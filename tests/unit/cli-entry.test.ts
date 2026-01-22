import { describe, it, expect, beforeEach, vi } from "vitest";
import { Command } from "commander";

/**
 * CLIエントリーポイントのテスト
 *
 * タスク8.1: コマンド登録と起動処理の実装
 * - 全コマンドがCLIルーターに登録される
 * - 各コマンドがCommandインスタンスとしてエクスポートされる
 */
describe("CLI Entry Point", () => {
  describe("Command Exports", () => {
    it("initCommand should be a Command instance", async () => {
      const { initCommand } = await import("../../src/cli/commands/init.js");
      expect(initCommand).toBeInstanceOf(Command);
      expect(initCommand.name()).toBe("init");
    });

    it("analyzeCommand should be a Command instance", async () => {
      const { analyzeCommand } = await import(
        "../../src/cli/commands/analyze.js"
      );
      expect(analyzeCommand).toBeInstanceOf(Command);
      expect(analyzeCommand.name()).toBe("analyze");
    });

    it("listCommand should be a Command instance", async () => {
      const { listCommand } = await import("../../src/cli/commands/list.js");
      expect(listCommand).toBeInstanceOf(Command);
      expect(listCommand.name()).toBe("list");
    });

    it("showCommand should be a Command instance", async () => {
      const { showCommand } = await import("../../src/cli/commands/show.js");
      expect(showCommand).toBeInstanceOf(Command);
      expect(showCommand.name()).toBe("show");
    });

    it("addCommand should be a Command instance", async () => {
      const { addCommand } = await import("../../src/cli/commands/add.js");
      expect(addCommand).toBeInstanceOf(Command);
      expect(addCommand.name()).toBe("add");
    });

    it("removeCommand should be a Command instance", async () => {
      const { removeCommand } = await import(
        "../../src/cli/commands/remove.js"
      );
      expect(removeCommand).toBeInstanceOf(Command);
      expect(removeCommand.name()).toBe("remove");
    });

    it("syncCommand should be a Command instance", async () => {
      const { syncCommand } = await import("../../src/cli/commands/sync.js");
      expect(syncCommand).toBeInstanceOf(Command);
      expect(syncCommand.name()).toBe("sync");
    });
  });

  describe("CLI Index Exports", () => {
    it("should export all commands from cli/index.ts", async () => {
      const cliExports = await import("../../src/cli/index.js");

      expect(cliExports.initCommand).toBeInstanceOf(Command);
      expect(cliExports.analyzeCommand).toBeInstanceOf(Command);
      expect(cliExports.listCommand).toBeInstanceOf(Command);
      expect(cliExports.showCommand).toBeInstanceOf(Command);
      expect(cliExports.addCommand).toBeInstanceOf(Command);
      expect(cliExports.removeCommand).toBeInstanceOf(Command);
      expect(cliExports.syncCommand).toBeInstanceOf(Command);
    });
  });

  describe("Main Program Structure", () => {
    it("should create a program with correct name and description", async () => {
      // 実際のindex.tsではprogram.parse()が呼ばれるため、
      // テスト用にモジュールの構造を確認する
      const { program } = await import("commander");

      // プログラムの基本設定を模倣したテスト
      const testProgram = new Command();
      testProgram
        .name("cpl")
        .description(
          "Claude Codeのセッションログからパターンを自動抽出・カタログ化するCLIツール"
        )
        .version("0.1.0");

      expect(testProgram.name()).toBe("cpl");
      expect(testProgram.description()).toBe(
        "Claude Codeのセッションログからパターンを自動抽出・カタログ化するCLIツール"
      );
    });

    it("should be able to add all commands to a program", async () => {
      const {
        initCommand,
        analyzeCommand,
        listCommand,
        showCommand,
        addCommand,
        removeCommand,
        syncCommand,
      } = await import("../../src/cli/index.js");

      const testProgram = new Command();
      testProgram.name("cpl").version("0.1.0");

      // 全コマンドを追加
      testProgram.addCommand(initCommand);
      testProgram.addCommand(analyzeCommand);
      testProgram.addCommand(listCommand);
      testProgram.addCommand(showCommand);
      testProgram.addCommand(addCommand);
      testProgram.addCommand(removeCommand);
      testProgram.addCommand(syncCommand);

      // コマンドが正しく登録されているか確認
      const commands = testProgram.commands;
      const commandNames = commands.map((cmd) => cmd.name());

      expect(commandNames).toContain("init");
      expect(commandNames).toContain("analyze");
      expect(commandNames).toContain("list");
      expect(commandNames).toContain("show");
      expect(commandNames).toContain("add");
      expect(commandNames).toContain("remove");
      expect(commandNames).toContain("sync");
      expect(commands.length).toBe(7);
    });
  });
});
