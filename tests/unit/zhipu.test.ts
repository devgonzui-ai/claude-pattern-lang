import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createZhipuClient } from "../../src/llm/providers/zhipu.js";

describe("zhipu", () => {
  describe("createZhipuClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("LLMClientインターフェースを持つオブジェクトを返す", () => {
      process.env.ZHIPUAI_API_KEY = "test-api-key";
      const client = createZhipuClient("glm-4", "ZHIPUAI_API_KEY");

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("APIキーの環境変数が設定されていない場合エラーをスローする", () => {
      delete process.env.ZHIPUAI_API_KEY;

      expect(() => createZhipuClient("glm-4", "ZHIPUAI_API_KEY")).toThrow(
        "環境変数 ZHIPUAI_API_KEY が設定されていません"
      );
    });

    it("指定されたモデル名を使用する", () => {
      process.env.ZHIPUAI_API_KEY = "test-api-key";
      const modelName = "glm-4-flash";

      const client = createZhipuClient(modelName, "ZHIPUAI_API_KEY");

      expect(client).toBeDefined();
    });
  });
});
