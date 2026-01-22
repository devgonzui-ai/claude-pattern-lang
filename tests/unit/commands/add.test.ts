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
      errors: ["名前は必須です"],
    });

    await addFromFileAction("/path/to/pattern.yaml");

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("名前は必須です"));
    expect(store.addPattern).not.toHaveBeenCalled();
  });

  it("ファイルが読み込めない場合はエラーを表示する", async () => {
    vi.mocked(fs.readYaml).mockResolvedValue(null);

    await addFromFileAction("/path/to/not-found.yaml");

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("読み込めません"));
  });
});
