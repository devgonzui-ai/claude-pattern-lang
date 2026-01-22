import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { homedir } from "node:os";
import yaml from "js-yaml";

/**
 * パターンディレクトリのパス
 */
export function getPatternsDir(): string {
  return `${homedir()}/.claude-patterns`;
}

/**
 * パターンカタログファイルのパス
 */
export function getCatalogPath(): string {
  return `${getPatternsDir()}/patterns.yaml`;
}

/**
 * 設定ファイルのパス
 */
export function getConfigPath(): string {
  return `${getPatternsDir()}/config.yaml`;
}

/**
 * ファイルが存在するか確認
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * ファイルを読み込む
 */
export async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

/**
 * ファイルを書き込む（必要に応じてディレクトリ作成）
 */
export async function writeTextFile(
  path: string,
  content: string
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf-8");
}

/**
 * ディレクトリを再帰的に作成する
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * YAMLファイルを読み込んでパースする
 * ファイルが存在しない場合はnullを返す
 */
export async function readYaml<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    if (!content.trim()) {
      return null;
    }
    return yaml.load(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * オブジェクトをYAMLファイルとして書き込む
 * 必要に応じて親ディレクトリを作成する
 */
export async function writeYaml<T>(filePath: string, data: T): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const content = yaml.dump(data, { lineWidth: -1 });
  await writeFile(filePath, content, "utf-8");
}
