import type { PatternInput } from "../../types/index.js";

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * パターン入力をバリデーションする
 */
export function validatePatternInput(
  input: PatternInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name || input.name.trim() === "") {
    errors.push({ field: "name", message: "パターン名は必須です" });
  }

  if (!input.type || !["prompt", "solution", "code"].includes(input.type)) {
    errors.push({
      field: "type",
      message: "typeは prompt, solution, code のいずれかです",
    });
  }

  if (!input.context || input.context.trim() === "") {
    errors.push({ field: "context", message: "contextは必須です" });
  }

  if (!input.solution || input.solution.trim() === "") {
    errors.push({ field: "solution", message: "solutionは必須です" });
  }

  return errors;
}
