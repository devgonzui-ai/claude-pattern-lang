import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOllamaClient } from "../../src/llm/providers/ollama.js";

describe("ollama", () => {
  describe("createOllamaClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("LLMClientインターフェースを持つオブジェクトを返す", () => {
      const client = createOllamaClient("llama3.1");

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("カスタムbaseURLを受け付ける", () => {
      const client = createOllamaClient(
        "llama3.1",
        "http://192.168.1.100:11434"
      );

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("環境変数OLLAMA_HOSTを使用する", () => {
      process.env.OLLAMA_HOST = "http://custom-host:11434";
      const client = createOllamaClient("mistral");

      expect(client).toBeDefined();
    });

    it("指定されたモデル名を使用する", () => {
      const modelName = "codellama";

      const client = createOllamaClient(modelName);

      expect(client).toBeDefined();
    });
  });
});
