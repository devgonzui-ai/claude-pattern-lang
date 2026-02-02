import type { Pattern, PatternInput, PatternCatalog } from "../../types/index.js";
import { getCatalogPath, readYaml, writeYaml } from "../../utils/fs.js";
import { t } from "../../i18n/index.js";

/**
 * 曖昧なID指定エラー（複数のパターンにマッチした場合）
 */
export class AmbiguousIdentifierError extends Error {
  constructor(
    public identifier: string,
    public matches: Pattern[]
  ) {
    super(t("errors.ambiguousId", { identifier }));
    this.name = "AmbiguousIdentifierError";
  }
}

/**
 * パターンカタログを読み込む
 */
export async function loadCatalog(): Promise<PatternCatalog> {
  const catalogPath = getCatalogPath();
  const catalog = await readYaml<PatternCatalog>(catalogPath);
  return catalog ?? { patterns: [] };
}

/**
 * パターンカタログを保存する
 */
export async function saveCatalog(catalog: PatternCatalog): Promise<void> {
  const catalogPath = getCatalogPath();
  await writeYaml(catalogPath, catalog);
}

/**
 * パターンを追加する
 */
export async function addPattern(input: PatternInput): Promise<Pattern> {
  const catalog = await loadCatalog();
  const now = new Date().toISOString();

  const pattern: Pattern = {
    id: crypto.randomUUID(),
    name: input.name,
    type: input.type,
    context: input.context,
    solution: input.solution,
    problem: input.problem,
    example: input.example,
    example_prompt: input.example_prompt,
    related: input.related,
    tags: input.tags,
    created_at: now,
    updated_at: now,
  };

  catalog.patterns.push(pattern);
  await saveCatalog(catalog);

  return pattern;
}

/**
 * パターンを削除する（IDまたは名前で検索、プレフィックスマッチ対応）
 * @throws {AmbiguousIdentifierError} 複数のパターンにマッチした場合
 */
export async function removePatternByIdentifier(identifier: string): Promise<boolean> {
  const catalog = await loadCatalog();

  // 1. 完全一致ID
  let index = catalog.patterns.findIndex((p) => p.id === identifier);

  // 2. プレフィックスマッチID（短縮ID対応）
  if (index === -1) {
    const prefixMatches = catalog.patterns
      .map((p, i) => ({ pattern: p, index: i }))
      .filter(({ pattern }) => pattern.id.startsWith(identifier));

    if (prefixMatches.length === 1) {
      index = prefixMatches[0].index;
    } else if (prefixMatches.length > 1) {
      throw new AmbiguousIdentifierError(
        identifier,
        prefixMatches.map(({ pattern }) => pattern)
      );
    }
  }

  // 3. 名前で検索
  if (index === -1) {
    index = catalog.patterns.findIndex((p) => p.name === identifier);
  }

  if (index === -1) {
    return false;
  }

  catalog.patterns.splice(index, 1);
  await saveCatalog(catalog);

  return true;
}

/**
 * パターンを削除する（名前のみ、後方互換性用）
 * @deprecated removePatternByIdentifierを使用してください
 */
export async function removePattern(name: string): Promise<boolean> {
  return removePatternByIdentifier(name);
}

/**
 * パターンをIDまたは名前で取得する（プレフィックスマッチ対応）
 * 優先順位: 完全一致ID → プレフィックスマッチID → 名前
 * @throws {AmbiguousIdentifierError} 複数のパターンにマッチした場合
 */
export async function getPatternByIdentifier(identifier: string): Promise<Pattern | null> {
  const catalog = await loadCatalog();

  // 1. 完全一致ID
  const exactMatch = catalog.patterns.find((p) => p.id === identifier);
  if (exactMatch) {
    return exactMatch;
  }

  // 2. プレフィックスマッチID（短縮ID対応）
  const prefixMatches = catalog.patterns.filter((p) => p.id.startsWith(identifier));
  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }
  if (prefixMatches.length > 1) {
    throw new AmbiguousIdentifierError(identifier, prefixMatches);
  }

  // 3. 名前で検索
  return catalog.patterns.find((p) => p.name === identifier) ?? null;
}

/**
 * パターンを取得する（名前のみ、後方互換性用）
 * @deprecated getPatternByIdentifierを使用してください
 */
export async function getPattern(name: string): Promise<Pattern | null> {
  return getPatternByIdentifier(name);
}
