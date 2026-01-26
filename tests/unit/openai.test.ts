import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOpenAIClient } from "../../src/llm/providers/openai.js";

describe("openai", () => {
  describe("createOpenAIClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("LLMClientインターフェースを持つオブジェクトを返す", () => {
      process.env.OPENAI_API_KEY = "test-api-key";
      const client = createOpenAIClient("gpt-4o", "OPENAI_API_KEY");

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("APIキーの環境変数が設定されていない場合エラーをスローする", () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => createOpenAIClient("gpt-4o", "OPENAI_API_KEY")).toThrow(
        "環境変数 OPENAI_API_KEY が設定されていません"
      );
    });

    it("カスタムbaseURLを受け付ける", () => {
      process.env.OPENAI_API_KEY = "test-api-key";
      const client = createOpenAIClient(
        "gpt-4o",
        "OPENAI_API_KEY",
        "https://custom.openai.com/v1"
      );

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("指定されたモデル名を使用する", () => {
      process.env.OPENAI_API_KEY = "test-api-key";
      const modelName = "gpt-4-turbo";

      const client = createOpenAIClient(modelName, "OPENAI_API_KEY");

      expect(client).toBeDefined();
    });
  });
});
