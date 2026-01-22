import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  info,
  success,
  warn,
  error,
  table,
  setLogLevel,
} from "../../src/utils/logger.js";

describe("logger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setLogLevel("info");
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("info", () => {
    it("情報メッセージを青色で表示する", () => {
      info("テストメッセージ");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("テストメッセージ");
      expect(output).toContain("[INFO]");
    });
  });

  describe("success", () => {
    it("成功メッセージを緑色で表示する", () => {
      success("成功しました");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("成功しました");
      expect(output).toContain("✓");
    });
  });

  describe("warn", () => {
    it("警告メッセージを黄色で表示する", () => {
      warn("警告です");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain("警告です");
      expect(output).toContain("[WARN]");
    });
  });

  describe("error", () => {
    it("エラーメッセージを赤色で表示する", () => {
      error("エラーが発生しました");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = consoleErrorSpy.mock.calls[0][0] as string;
      expect(output).toContain("エラーが発生しました");
      expect(output).toContain("[ERROR]");
    });
  });

  describe("table", () => {
    it("データをテーブル形式で表示する", () => {
      const data = [
        { name: "パターン1", type: "prompt" },
        { name: "パターン2", type: "solution" },
      ];

      table(data);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      // テーブルにデータが含まれていることを確認
      expect(output).toContain("パターン1");
      expect(output).toContain("パターン2");
      expect(output).toContain("prompt");
      expect(output).toContain("solution");
    });

    it("空の配列の場合でもエラーにならない", () => {
      expect(() => table([])).not.toThrow();
    });

    it("ヘッダー行を含む", () => {
      const data = [{ name: "テスト", type: "code" }];

      table(data);

      const output = consoleSpy.mock.calls[0][0] as string;
      // ヘッダーがキー名から生成される
      expect(output).toContain("name");
      expect(output).toContain("type");
    });
  });
});
