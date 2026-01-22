import type { Pattern, PatternInput, PatternCatalog } from "../../types/index.js";
import { getCatalogPath, readYaml, writeYaml } from "../../utils/fs.js";

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
 * パターンを削除する
 */
export async function removePattern(name: string): Promise<boolean> {
  const catalog = await loadCatalog();
  const index = catalog.patterns.findIndex((p) => p.name === name);

  if (index === -1) {
    return false;
  }

  catalog.patterns.splice(index, 1);
  await saveCatalog(catalog);

  return true;
}

/**
 * パターンを取得する
 */
export async function getPattern(name: string): Promise<Pattern | null> {
  const catalog = await loadCatalog();
  return catalog.patterns.find((p) => p.name === name) ?? null;
}
