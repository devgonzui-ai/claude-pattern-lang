import { describe, it, expect, vi, beforeEach } from "vitest";
import { initAction } from "../../../src/cli/commands/init.js";
import * as fs from "../../../src/utils/fs.js";
import * as logger from "../../../src/utils/logger.js";

// モック
vi.mock("../../../src/utils/fs.js", () => ({
  ensureDir: vi.fn(),
  fileExists: vi.fn(),
  writeYaml: vi.fn(),
  getPatternsDir: vi.fn(() => "/home/test/.claude-patterns"),
  getConfigPath: vi.fn(() => "/home/test/.claude-patterns/config.yaml"),
  getCatalogPath: vi.fn(() => "/home/test/.claude-patterns/patterns.yaml"),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.init.configExists": "Config file already exists. Delete manually to overwrite.",
      "messages.init.usingDefault": "Using default settings (Anthropic Claude)",
      "messages.init.configuringLlm": "Configuring LLM settings...",
      "messages.init.creatingDir": `Creating directory: ${params?.path}`,
      "messages.init.creatingConfig": `Creating config file: ${params?.path}`,
      "messages.init.creatingCatalog": `Creating catalog file: ${params?.path}`,
      "messages.init.completed": "Initialization completed!",
      "messages.init.nextSteps": "Next steps:",
      "messages.init.step1ApiKey": `  1. Set the ${params?.envVar} environment variable`,
      "messages.init.step1Ollama": "  1. Make sure Ollama server is running",
      "messages.init.step2Analyze": "  2. Run `cpl analyze` to extract patterns",
      "messages.init.step3Sync": "  3. Run `cpl sync` to sync patterns",
      "messages.init.hookInstructions": "To enable Claude Code hooks:",
      "messages.init.hookStep1": "  Add hook settings to ~/.claude/settings.json, then",
      "messages.init.hookStep2": "  Run `/hooks` in Claude Code to approve.",
      "messages.init.error": `Error during initialization: ${params?.error}`,
      "messages.config.selectProvider": "Select LLM provider",
      "messages.config.inputModel": "Enter model name",
      "messages.config.inputApiKeyEnv": "Enter API key environment variable",
      "messages.config.inputOllamaHost": "Enter Ollama host",
      "providers.anthropic": "Anthropic (Claude)",
      "providers.openai": "OpenAI (GPT-4)",
      "providers.gemini": "Google Gemini",
      "providers.ollama": "Ollama (local)",
      "providers.deepseek": "DeepSeek",
      "providers.claudeCode": "Claude Code (no API key required)",
      "cli.commands.init.description": "Initialize the tool",
      "cli.commands.init.options.default": "Use default settings",
    };
    return messages[key] || key;
  }),
}));

describe("initAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ディレクトリと設定ファイルを作成する", async () => {
    vi.mocked(fs.fileExists).mockResolvedValue(false);

    await initAction({ default: true });

    expect(fs.ensureDir).toHaveBeenCalled();
    expect(fs.writeYaml).toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalled();
  });

  it("既存の設定がある場合は警告を表示する", async () => {
    vi.mocked(fs.fileExists).mockResolvedValue(true);

    await initAction();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("already exists"));
  });
});
