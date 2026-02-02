import { describe, it, expect, vi, beforeEach } from "vitest";
import { addFromFileAction } from "../../../src/cli/commands/add.js";
import * as store from "../../../src/core/catalog/store.js";
import * as validator from "../../../src/core/catalog/validator.js";
import * as fs from "../../../src/utils/fs.js";
import * as logger from "../../../src/utils/logger.js";
import type { PatternInput } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  addPattern: vi.fn(),
}));

vi.mock("../../../src/core/catalog/validator.js", () => ({
  validatePatternInput: vi.fn(),
}));

vi.mock("../../../src/utils/fs.js", () => ({
  readYaml: vi.fn(),
}));

vi.mock("../../../src/utils/logger.js", () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.add.fileNotFound": `Could not read file "${params?.path}".`,
      "messages.add.validationError": `Validation error:\n  - ${params?.errors}`,
      "messages.add.added": `Added pattern "${params?.name}".`,
      "messages.add.interactive": "Adding pattern interactively.",
      "messages.add.promptName": "Pattern name: ",
      "messages.add.promptType": "Type (prompt/solution/code): ",
      "messages.add.promptContext": "Context: ",
      "messages.add.promptSolution": "Solution: ",
      "cli.commands.add.description": "Add pattern manually",
      "cli.commands.add.options.file": "Add from YAML file",
      "cli.commands.add.options.interactive": "Interactive mode (default)",
    };
    return messages[key] || key;
  }),
}));

describe("addFromFileAction", () => {
  const mockPatternInput: PatternInput = {
    name: "テストパターン",
    type: "prompt",
    context: "テストコンテキスト",
    solution: "テストソリューション",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("YAMLファイルからパターンを読み込んで追加する", async () => {
    vi.mocked(fs.readYaml).mockResolvedValue(mockPatternInput);
    vi.mocked(validator.validatePatternInput).mockReturnValue({ valid: true });
    vi.mocked(store.addPattern).mockResolvedValue({
      ...mockPatternInput,
      id: "test-id",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    await addFromFileAction("/path/to/pattern.yaml");

    expect(fs.readYaml).toHaveBeenCalledWith("/path/to/pattern.yaml");
    expect(validator.validatePatternInput).toHaveBeenCalledWith(mockPatternInput);
    expect(store.addPattern).toHaveBeenCalledWith(mockPatternInput);
    expect(logger.success).toHaveBeenCalled();
  });

  it("バリデーションエラーの場合はエラーを表示する", async () => {
    vi.mocked(fs.readYaml).mockResolvedValue(mockPatternInput);
    vi.mocked(validator.validatePatternInput).mockReturnValue({
      valid: false,
      errors: ["Name is required"],
    });

    await addFromFileAction("/path/to/pattern.yaml");

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Name is required"));
    expect(store.addPattern).not.toHaveBeenCalled();
  });

  it("ファイルが読み込めない場合はエラーを表示する", async () => {
    vi.mocked(fs.readYaml).mockResolvedValue(null);

    await addFromFileAction("/path/to/not-found.yaml");

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Could not read"));
  });
});
