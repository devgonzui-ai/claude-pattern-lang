import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

/**
 * SessionEndフックで実行するコマンド
 */
const SESSION_END_HOOK_COMMAND = "cpl _hook-session-end";

/**
 * Claude Code設定ファイルのパスを取得
 */
export function getClaudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/**
 * 設定ファイルを読み込む（存在しない場合は空オブジェクト）
 */
async function readSettings(): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(getClaudeSettingsPath(), "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

/**
 * 設定ファイルを書き込む（必要に応じてディレクトリ作成）
 */
async function writeSettings(settings: Record<string, unknown>): Promise<void> {
  const settingsPath = getClaudeSettingsPath();
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * フック設定をClaude Code設定に追加する
 */
export async function installHooks(): Promise<void> {
  const settings = await readSettings();

  // hooksがなければ作成
  if (!settings.hooks) {
    settings.hooks = {};
  }

  const hooks = settings.hooks as Record<string, unknown>;

  // SessionEndフックが既に存在する場合は上書きしない
  if (hooks.SessionEnd) {
    return;
  }

  // SessionEndフックを追加
  hooks.SessionEnd = SESSION_END_HOOK_COMMAND;

  await writeSettings(settings);
}

/**
 * フック設定を削除する
 */
export async function uninstallHooks(): Promise<void> {
  const settings = await readSettings();

  // hooksがなければ何もしない
  if (!settings.hooks) {
    return;
  }

  const hooks = settings.hooks as Record<string, unknown>;

  // SessionEndフックを削除
  delete hooks.SessionEnd;

  // hooksが空になったらhooksキー自体を削除
  if (Object.keys(hooks).length === 0) {
    delete settings.hooks;
  }

  await writeSettings(settings);
}

/**
 * フック設定が存在するか確認する
 */
export async function isHooksInstalled(): Promise<boolean> {
  const settings = await readSettings();

  if (!settings.hooks) {
    return false;
  }

  const hooks = settings.hooks as Record<string, unknown>;
  return typeof hooks.SessionEnd === "string" && hooks.SessionEnd.includes("cpl");
}
