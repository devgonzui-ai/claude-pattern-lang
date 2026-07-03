import { join } from "node:path";
import { homedir } from "node:os";
import yaml from "js-yaml";
import type { Pattern } from "../../types/index.js";

/** Claude Codeのスキル名の最大長 */
const SKILL_NAME_MAX_LENGTH = 64;

/** スキルのdescriptionの最大長 */
const SKILL_DESCRIPTION_MAX_LENGTH = 500;

/** cplが生成したスキルであることを示すフッターマーカー */
export const SKILL_FOOTER_MARKER =
  "<!-- generated-by: claude-pattern-lang -->";

/**
 * パターン名からスキル名（ディレクトリ名）を生成する
 * 英数字・ハイフン・Unicode文字を保持し、それ以外はハイフンに置換する
 */
export function toSkillName(patternName: string): string {
  const slug = patternName
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const truncated = slug.slice(0, SKILL_NAME_MAX_LENGTH).replace(/-$/, "");
  return truncated || "pattern";
}

/**
 * パターンからスキルのdescription（トリガー条件）を生成する
 * Claude Codeはこのdescriptionを見てスキルを読み込むか判断する
 */
export function toSkillDescription(pattern: Pattern): string {
  const parts: string[] = [pattern.context];
  if (pattern.problem) {
    parts.push(pattern.problem);
  }
  if (pattern.tags && pattern.tags.length > 0) {
    parts.push(`Keywords: ${pattern.tags.join(", ")}`);
  }
  const description = parts.join(" / ").replace(/\s+/g, " ").trim();
  return description.slice(0, SKILL_DESCRIPTION_MAX_LENGTH);
}

/**
 * パターンからSKILL.mdのコンテンツを生成する
 */
export function generateSkillMd(pattern: Pattern): string {
  const frontmatter = yaml
    .dump(
      {
        name: toSkillName(pattern.name),
        description: toSkillDescription(pattern),
      },
      { lineWidth: -1 }
    )
    .trimEnd();

  const lines: string[] = ["---", frontmatter, "---", "", `# ${pattern.name}`, ""];

  lines.push(`**Type**: ${pattern.type}`);
  lines.push("");
  lines.push("## Context");
  lines.push("");
  lines.push(pattern.context);
  lines.push("");

  if (pattern.problem) {
    lines.push("## Problem");
    lines.push("");
    lines.push(pattern.problem);
    lines.push("");
  }

  lines.push("## Solution");
  lines.push("");
  lines.push(pattern.solution);
  lines.push("");

  if (pattern.example) {
    lines.push("## Example");
    lines.push("");
    lines.push("```");
    lines.push(pattern.example.trimEnd());
    lines.push("```");
    lines.push("");
  }

  if (pattern.example_prompt) {
    lines.push("## Example Prompt");
    lines.push("");
    lines.push(pattern.example_prompt);
    lines.push("");
  }

  if (pattern.related && pattern.related.length > 0) {
    lines.push(`**Related**: ${pattern.related.join(", ")}`);
    lines.push("");
  }

  if (pattern.tags && pattern.tags.length > 0) {
    lines.push(`**Tags**: ${pattern.tags.join(", ")}`);
    lines.push("");
  }

  lines.push(SKILL_FOOTER_MARKER);
  lines.push("");

  return lines.join("\n");
}

/** エクスポートされるスキルファイル1件分 */
export interface SkillFile {
  /** 元になったパターン */
  pattern: Pattern;
  /** スキル名（ディレクトリ名） */
  skillName: string;
  /** SKILL.mdの絶対パス */
  filePath: string;
  /** SKILL.mdのコンテンツ */
  content: string;
}

/**
 * スキルの出力先ディレクトリを取得する
 */
export function getSkillsDir(options: {
  project?: string;
  global?: boolean;
}): string {
  if (options.global) {
    return join(homedir(), ".claude", "skills");
  }
  if (options.project) {
    return join(options.project, ".claude", "skills");
  }
  return join(process.cwd(), ".claude", "skills");
}

/**
 * パターン一覧からスキルファイル一覧を生成する
 * スキル名が重複する場合は連番サフィックスを付与する
 */
export function buildSkillFiles(
  patterns: Pattern[],
  skillsDir: string
): SkillFile[] {
  const usedNames = new Set<string>();
  const files: SkillFile[] = [];

  for (const pattern of patterns) {
    let skillName = toSkillName(pattern.name);
    let suffix = 2;
    while (usedNames.has(skillName)) {
      skillName = `${toSkillName(pattern.name)}-${suffix}`;
      suffix += 1;
    }
    usedNames.add(skillName);

    files.push({
      pattern,
      skillName,
      filePath: join(skillsDir, skillName, "SKILL.md"),
      content: generateSkillMd(pattern),
    });
  }

  return files;
}
