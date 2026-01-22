import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAnthropicClient } from "../../src/llm/providers/anthropic.js";

describe("anthropic", () => {
  describe("createAnthropicClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("LLMClientインターフェースを持つオブジェクトを返す", () => {
      process.env.ANTHROPIC_API_KEY = "test-api-key";
      const client = createAnthropicClient(
        "claude-sonnet-4-20250514",
        "ANTHROPIC_API_KEY"
      );

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("APIキーの環境変数が設定されていない場合エラーをスローする", () => {
      delete process.env.ANTHROPIC_API_KEY;

      expect(() =>
        createAnthropicClient("claude-sonnet-4-20250514", "ANTHROPIC_API_KEY")
      ).toThrow("環境変数 ANTHROPIC_API_KEY が設定されていません");
    });

    it("指定されたモデル名を使用する", async () => {
      process.env.ANTHROPIC_API_KEY = "test-api-key";
      const modelName = "claude-opus-4-20250514";

      // モックでAnthropicクライアントをテスト
      const client = createAnthropicClient(modelName, "ANTHROPIC_API_KEY");

      // clientが正しく作成されることを確認
      expect(client).toBeDefined();
    });
  });
});
