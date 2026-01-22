import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLLMClient } from "../../src/llm/client.js";
import type { LLMConfig } from "../../src/types/index.js";

describe("client", () => {
  describe("createLLMClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("anthropicプロバイダの場合、Anthropicクライアントを返す", async () => {
      process.env.ANTHROPIC_API_KEY = "test-api-key";

      const config: LLMConfig = {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("サポートされていないプロバイダの場合エラーをスローする", async () => {
      const config: LLMConfig = {
        provider: "openai" as const,
        model: "gpt-4",
        api_key_env: "OPENAI_API_KEY",
      };

      await expect(createLLMClient(config)).rejects.toThrow(
        "プロバイダ openai は現在サポートされていません"
      );
    });

    it("localプロバイダの場合エラーをスローする", async () => {
      const config: LLMConfig = {
        provider: "local" as const,
        model: "local-model",
        api_key_env: "",
      };

      await expect(createLLMClient(config)).rejects.toThrow(
        "プロバイダ local は現在サポートされていません"
      );
    });
  });
});
