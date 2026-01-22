/**
 * マスク文字
 */
const REDACTED = "[REDACTED]";

/**
 * APIキーパターン
 */
const API_KEY_PATTERN =
  /(api[_-]?key)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi;

/**
 * パスワード・シークレットパターン
 */
const PASSWORD_PATTERN =
  /(password|passwd|pwd|secret)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi;

/**
 * トークンパターン
 */
const TOKEN_PATTERN =
  /(token)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi;

/**
 * Bearer認証パターン
 */
const BEARER_PATTERN = /Bearer\s+[^\s]+/gi;

/**
 * Basic認証パターン
 */
const BASIC_PATTERN = /Basic\s+[^\s]+/gi;

/**
 * APIキーをマスクする
 */
export function maskApiKeys(text: string): string {
  return text.replace(API_KEY_PATTERN, REDACTED);
}

/**
 * パスワードをマスクする
 */
export function maskPasswords(text: string): string {
  return text.replace(PASSWORD_PATTERN, REDACTED);
}

/**
 * トークンをマスクする（Bearer/Basic認証含む）
 */
export function maskTokens(text: string): string {
  let result = text;
  result = result.replace(TOKEN_PATTERN, REDACTED);
  result = result.replace(BEARER_PATTERN, REDACTED);
  result = result.replace(BASIC_PATTERN, REDACTED);
  return result;
}

/**
 * テキストから機密情報をマスクする
 */
export function sanitize(text: string): string {
  let result = text;
  result = maskApiKeys(result);
  result = maskPasswords(result);
  result = maskTokens(result);
  return result;
}

/**
 * オブジェクトの文字列フィールドを再帰的にサニタイズする
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitize(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as T;
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }
  return obj;
}
