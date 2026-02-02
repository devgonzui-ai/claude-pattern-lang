import type { PatternInput } from "../../types/index.js";
import { t } from "../../i18n/index.js";

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
    errors.push(t("validation.nameRequired"));
  }

  if (!input.type || !["prompt", "solution", "code"].includes(input.type)) {
    errors.push(t("validation.typeInvalid"));
  }

  if (!input.context || input.context.trim() === "") {
    errors.push(t("validation.contextRequired"));
  }

  if (!input.solution || input.solution.trim() === "") {
    errors.push(t("validation.solutionRequired"));
  }

  if (errors.length === 0) {
    return { valid: true };
  }

  return { valid: false, errors };
}
