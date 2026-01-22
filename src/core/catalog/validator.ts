import type { PatternInput } from "../../types/index.js";

/**
 * バリデーション結果（discriminated union）
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

/**
 * パターン入力をバリデーションする
 */
export function validatePatternInput(input: PatternInput): ValidationResult {
  const errors: string[] = [];

  if (!input.name || input.name.trim() === "") {
    errors.push("パターン名は必須です");
  }

  if (!input.type || !["prompt", "solution", "code"].includes(input.type)) {
    errors.push("typeは prompt, solution, code のいずれかです");
  }

  if (!input.context || input.context.trim() === "") {
    errors.push("contextは必須です");
  }

  if (!input.solution || input.solution.trim() === "") {
    errors.push("solutionは必須です");
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return { valid: false, errors };
}
