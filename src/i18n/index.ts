import type { Language, Messages } from "./types.js";
import { ja } from "./locales/ja.js";
import { en } from "./locales/en.js";
import { fileExists, readYaml, getConfigPath } from "../utils/fs.js";
import type { Config } from "../types/config.js";

/**
 * 利用可能なロケール
 */
const locales: Record<Language, Messages> = {
  ja,
  en,
};

/**
 * 現在の言語
 */
let currentLanguage: Language = "en";

/**
 * 現在のメッセージ
 */
let currentMessages: Messages = locales.en;

/**
 * 言語を設定
 */
export function setLanguage(lang: Language): void {
  if (locales[lang]) {
    currentLanguage = lang;
    currentMessages = locales[lang];
  }
}

/**
 * 現在の言語を取得
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * i18nを初期化
 * 優先順位: 環境変数 CPL_LANG > 設定ファイル > デフォルト(en)
 */
export async function initI18n(): Promise<void> {
  // 1. 環境変数をチェック
  const envLang = process.env.CPL_LANG;
  if (envLang && (envLang === "en" || envLang === "ja")) {
    setLanguage(envLang);
    return;
  }

  // 2. 設定ファイルをチェック
  try {
    const configPath = getConfigPath();
    if (await fileExists(configPath)) {
      const config = await readYaml<Config>(configPath);
      if (config?.language && (config.language === "en" || config.language === "ja")) {
        setLanguage(config.language);
        return;
      }
    }
  } catch {
    // 設定読み込み失敗は無視
  }

  // 3. デフォルトは英語
  setLanguage("en");
}

/**
 * ネストされたキーから値を取得
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * 翻訳関数
 * @param key - ドット区切りのメッセージキー (例: "messages.init.completed")
 * @param params - 置換パラメータ (例: { name: "test" })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const message = getNestedValue(currentMessages, key);

  if (!message) {
    // フォールバック: 英語から取得を試みる
    const fallback = getNestedValue(locales.en, key);
    if (fallback) {
      return replaceParams(fallback, params);
    }
    // キーをそのまま返す（開発時のデバッグ用）
    return key;
  }

  return replaceParams(message, params);
}

/**
 * パラメータを置換
 */
function replaceParams(message: string, params?: Record<string, string | number>): string {
  if (!params) {
    return message;
  }

  let result = message;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

export type { Language, Messages };
