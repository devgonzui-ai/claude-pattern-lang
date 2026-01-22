import { describe, it, expect } from "vitest";
import {
  validatePatternInput,
  type ValidationResult,
} from "../../src/core/catalog/validator.js";

describe("validatePatternInput", () => {
  describe("有効な入力", () => {
    it("有効なパターン入力に対して valid: true を返す", () => {
      const input = {
        name: "テストパターン",
        type: "prompt" as const,
        context: "テスト用のコンテキスト",
        solution: "テスト用のソリューション",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(true);
    });

    it("全てのパターンタイプ（prompt）を受け入れる", () => {
      const input = {
        name: "プロンプトパターン",
        type: "prompt" as const,
        context: "プロンプトのコンテキスト",
        solution: "プロンプトのソリューション",
      };

      const result = validatePatternInput(input);
      expect(result.valid).toBe(true);
    });

    it("全てのパターンタイプ（solution）を受け入れる", () => {
      const input = {
        name: "ソリューションパターン",
        type: "solution" as const,
        context: "ソリューションのコンテキスト",
        solution: "ソリューションの解決策",
      };

      const result = validatePatternInput(input);
      expect(result.valid).toBe(true);
    });

    it("全てのパターンタイプ（code）を受け入れる", () => {
      const input = {
        name: "コードパターン",
        type: "code" as const,
        context: "コードのコンテキスト",
        solution: "コードのソリューション",
      };

      const result = validatePatternInput(input);
      expect(result.valid).toBe(true);
    });
  });

  describe("必須フィールドのバリデーション", () => {
    it("名前が空の場合にエラーを返す", () => {
      const input = {
        name: "",
        type: "prompt" as const,
        context: "テスト用のコンテキスト",
        solution: "テスト用のソリューション",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain("パターン名は必須です");
      }
    });

    it("contextが空の場合にエラーを返す", () => {
      const input = {
        name: "テストパターン",
        type: "prompt" as const,
        context: "",
        solution: "テスト用のソリューション",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain("contextは必須です");
      }
    });

    it("solutionが空の場合にエラーを返す", () => {
      const input = {
        name: "テストパターン",
        type: "prompt" as const,
        context: "テスト用のコンテキスト",
        solution: "",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain("solutionは必須です");
      }
    });

    it("複数のフィールドが空の場合に全てのエラーを返す", () => {
      const input = {
        name: "",
        type: "prompt" as const,
        context: "",
        solution: "",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain("パターン名は必須です");
        expect(result.errors).toContain("contextは必須です");
        expect(result.errors).toContain("solutionは必須です");
      }
    });
  });

  describe("typeのバリデーション", () => {
    it("無効なtypeの場合にエラーを返す", () => {
      const input = {
        name: "テストパターン",
        type: "invalid" as "prompt",
        context: "テスト用のコンテキスト",
        solution: "テスト用のソリューション",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain(
          "typeは prompt, solution, code のいずれかです"
        );
      }
    });
  });

  describe("discriminated union型", () => {
    it("valid: trueの場合はerrorsプロパティがない", () => {
      const input = {
        name: "テストパターン",
        type: "prompt" as const,
        context: "テスト用のコンテキスト",
        solution: "テスト用のソリューション",
      };

      const result = validatePatternInput(input);

      expect(result).toEqual({ valid: true });
      expect("errors" in result).toBe(false);
    });

    it("valid: falseの場合はerrorsプロパティがある", () => {
      const input = {
        name: "",
        type: "prompt" as const,
        context: "テスト用のコンテキスト",
        solution: "テスト用のソリューション",
      };

      const result = validatePatternInput(input);

      expect(result.valid).toBe(false);
      expect("errors" in result).toBe(true);
    });
  });
});
