import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGeminiClient } from "../../src/llm/providers/gemini.js";

describe("gemini", () => {
  describe("createGeminiClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("LLMClientインターフェースを持つオブジェクトを返す", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const client = createGeminiClient("gemini-2.0-flash", "GEMINI_API_KEY");

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("APIキーの環境変数が設定されていない場合エラーをスローする", () => {
      delete process.env.GEMINI_API_KEY;

      expect(() =>
        createGeminiClient("gemini-2.0-flash", "GEMINI_API_KEY")
      ).toThrow("環境変数 GEMINI_API_KEY が設定されていません");
    });

    it("指定されたモデル名を使用する", () => {
      process.env.GEMINI_API_KEY = "test-api-key";
      const modelName = "gemini-2.5-pro";

      const client = createGeminiClient(modelName, "GEMINI_API_KEY");

      expect(client).toBeDefined();
    });
  });
});
