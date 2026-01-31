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

    it("openaiプロバイダの場合、OpenAIクライアントを返す", async () => {
      process.env.OPENAI_API_KEY = "test-api-key";

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4o",
        api_key_env: "OPENAI_API_KEY",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("geminiプロバイダの場合、Geminiクライアントを返す", async () => {
      process.env.GEMINI_API_KEY = "test-api-key";

      const config: LLMConfig = {
        provider: "gemini",
        model: "gemini-2.0-flash",
        api_key_env: "GEMINI_API_KEY",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("ollamaプロバイダの場合、Ollamaクライアントを返す", async () => {
      const config: LLMConfig = {
        provider: "ollama",
        model: "llama3.1",
        api_key_env: "",
        base_url: "http://localhost:11434",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("deepseekプロバイダの場合、DeepSeekクライアントを返す", async () => {
      process.env.DEEPSEEK_API_KEY = "test-api-key";

      const config: LLMConfig = {
        provider: "deepseek",
        model: "deepseek-chat",
        api_key_env: "DEEPSEEK_API_KEY",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("openaiプロバイダでカスタムbase_urlを使用できる", async () => {
      process.env.OPENAI_API_KEY = "test-api-key";

      const config: LLMConfig = {
        provider: "openai",
        model: "gpt-4",
        api_key_env: "OPENAI_API_KEY",
        base_url: "https://custom.openai.com/v1",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });

    it("claude-codeプロバイダの場合、Claude Codeクライアントを返す", async () => {
      const config: LLMConfig = {
        provider: "claude-code",
        model: "claude-code",
        api_key_env: "",
      };

      const client = await createLLMClient(config);

      expect(client).toBeDefined();
      expect(typeof client.complete).toBe("function");
    });
  });
});
