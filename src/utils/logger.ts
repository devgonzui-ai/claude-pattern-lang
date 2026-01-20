import chalk from "chalk";

/**
 * ログレベル
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 現在のログレベル
 */
let currentLevel: LogLevel = "info";

/**
 * ログレベルを設定する
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * レベル優先度
 */
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 指定レベルのログを出力するべきか
 */
function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[currentLevel];
}

/**
 * デバッグログ
 */
export function debug(message: string): void {
  if (shouldLog("debug")) {
    console.log(chalk.gray(`[DEBUG] ${message}`));
  }
}

/**
 * 情報ログ
 */
export function info(message: string): void {
  if (shouldLog("info")) {
    console.log(chalk.blue(`[INFO] ${message}`));
  }
}

/**
 * 警告ログ
 */
export function warn(message: string): void {
  if (shouldLog("warn")) {
    console.log(chalk.yellow(`[WARN] ${message}`));
  }
}

/**
 * エラーログ
 */
export function error(message: string): void {
  if (shouldLog("error")) {
    console.error(chalk.red(`[ERROR] ${message}`));
  }
}

/**
 * 成功メッセージ
 */
export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}
