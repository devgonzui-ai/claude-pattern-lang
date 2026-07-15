import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

/**
 * SessionEndフックで実行するコマンド
 */
const SESSION_END_HOOK_COMMAND = "cpl _hook-session-end";

/**
 * Stopフックで実行するコマンド（auto_analyze用）
 */
const STOP_HOOK_COMMAND = "cpl _hook-stop";

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

  // 既に存在するフックは上書きしない
  let changed = false;
  if (!hooks.SessionEnd) {
    hooks.SessionEnd = SESSION_END_HOOK_COMMAND;
    changed = true;
  }
  if (!hooks.Stop) {
    hooks.Stop = STOP_HOOK_COMMAND;
    changed = true;
  }

  if (!changed) {
    return;
  }

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

  // cplのフックを削除（cpl以外のコマンドが設定されている場合は保持）
  if (typeof hooks.SessionEnd === "string" && hooks.SessionEnd.includes("cpl")) {
    delete hooks.SessionEnd;
  }
  if (typeof hooks.Stop === "string" && hooks.Stop.includes("cpl")) {
    delete hooks.Stop;
  }

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
