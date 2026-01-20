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
  _filePath: string
): Promise<ClaudeMdContent> {
  // TODO: 実装
  return {
    beforePatterns: "",
    patternsSection: null,
    afterPatterns: "",
  };
}

/**
 * CLAUDE.mdにパターンセクションを書き込む
 */
export async function writeClaudeMd(
  _filePath: string,
  _content: ClaudeMdContent
): Promise<void> {
  // TODO: 実装
}
