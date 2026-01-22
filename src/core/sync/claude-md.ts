import { fileExists, readTextFile, writeTextFile } from "../../utils/fs.js";
import {
  PATTERNS_SECTION_START,
  PATTERNS_SECTION_END,
} from "./merger.js";

/**
 * CLAUDE.mdファイルの内容
 */
export interface ClaudeMdContent {
  /** パターンセクション以前の内容 */
  beforePatterns: string;
  /** 既存のパターンセクション */
  patternsSection: string | null;
  /** パターンセクション以降の内容 */
  afterPatterns: string;
}

/**
 * CLAUDE.mdを読み込んでパースする
 */
export async function parseClaudeMd(
  filePath: string
): Promise<ClaudeMdContent> {
  // ファイルが存在しない場合は空のコンテンツを返す
  if (!(await fileExists(filePath))) {
    return {
      beforePatterns: "",
      patternsSection: null,
      afterPatterns: "",
    };
  }

  const content = await readTextFile(filePath);

  // パターンセクションの開始と終了を探す
  const startIdx = content.indexOf(PATTERNS_SECTION_START);
  const endIdx = content.indexOf(PATTERNS_SECTION_END);

  // パターンセクションがない場合
  if (startIdx === -1 || endIdx === -1) {
    return {
      beforePatterns: content,
      patternsSection: null,
      afterPatterns: "",
    };
  }

  // パターンセクションがある場合
  const beforePatterns = content.substring(0, startIdx);
  const patternsSection = content.substring(
    startIdx,
    endIdx + PATTERNS_SECTION_END.length
  );
  const afterPatterns = content.substring(endIdx + PATTERNS_SECTION_END.length);

  return {
    beforePatterns,
    patternsSection,
    afterPatterns,
  };
}

/**
 * CLAUDE.mdにパターンセクションを書き込む
 */
export async function writeClaudeMd(
  filePath: string,
  content: ClaudeMdContent
): Promise<void> {
  let result = content.beforePatterns;

  if (content.patternsSection !== null) {
    result += content.patternsSection;
  }

  result += content.afterPatterns;

  await writeTextFile(filePath, result);
}
