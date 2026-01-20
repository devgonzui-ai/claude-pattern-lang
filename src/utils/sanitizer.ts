/**
 * 機密情報をマスクするパターン
 */
const SENSITIVE_PATTERNS = [
  // APIキー
  /\b[A-Za-z0-9_-]{20,}(?:key|token|secret|password|credential)/gi,
  // 一般的なAPI キー形式
  /\bsk-[A-Za-z0-9]{32,}\b/g,
  /\bxoxb-[A-Za-z0-9-]+\b/g,
  /\bghp_[A-Za-z0-9]+\b/g,
  // パスワード（key=value形式）
  /(?:password|passwd|pwd|secret|api_key|apikey|token)[\s]*[:=][\s]*["']?[^\s"']+["']?/gi,
  // メールアドレス
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

/**
 * テキストから機密情報をマスクする
 */
export function sanitize(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
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
