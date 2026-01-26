import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDeepSeekClient } from "../../src/llm/providers/deepseek.js";

describe("deepseek", () => {
  describe("createDeepSeekClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("LLMClientインターフェースを持つオブジェクトを返す", () => {
      process.env.DEEPSEEK_API_KEY = "test-api-key";
      const client = createDeepSeekClient("deepseek-chat", "DEEPSEEK_API_KEY");

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("APIキーの環境変数が設定されていない場合エラーをスローする", () => {
      delete process.env.DEEPSEEK_API_KEY;

      expect(() =>
        createDeepSeekClient("deepseek-chat", "DEEPSEEK_API_KEY")
      ).toThrow("環境変数 DEEPSEEK_API_KEY が設定されていません");
    });

    it("指定されたモデル名を使用する", () => {
      process.env.DEEPSEEK_API_KEY = "test-api-key";
      const modelName = "deepseek-reasoner";

      const client = createDeepSeekClient(modelName, "DEEPSEEK_API_KEY");

      expect(client).toBeDefined();
    });
  });
});
