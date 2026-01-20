import { describe, it, expect } from "vitest";
import { validatePatternInput } from "../../src/core/catalog/validator.js";

describe("validatePatternInput", () => {
  it("有効なパターン入力を受け入れる", () => {
    const input = {
      name: "テストパターン",
      type: "prompt" as const,
      context: "テスト用のコンテキスト",
      solution: "テスト用のソリューション",
    };

    const errors = validatePatternInput(input);
    expect(errors).toHaveLength(0);
  });

  it("名前が空の場合にエラーを返す", () => {
    const input = {
      name: "",
      type: "prompt" as const,
      context: "テスト用のコンテキスト",
      solution: "テスト用のソリューション",
    };

    const errors = validatePatternInput(input);
    expect(errors).toContainEqual({
      field: "name",
      message: "パターン名は必須です",
    });
  });

  it("無効なtypeの場合にエラーを返す", () => {
    const input = {
      name: "テストパターン",
      type: "invalid" as "prompt",
      context: "テスト用のコンテキスト",
      solution: "テスト用のソリューション",
    };

    const errors = validatePatternInput(input);
    expect(errors).toContainEqual({
      field: "type",
      message: "typeは prompt, solution, code のいずれかです",
    });
  });
});
