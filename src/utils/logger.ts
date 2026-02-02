import chalk from "chalk";
import Table from "cli-table3";

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

/**
 * テーブル形式でデータを表示する
 */
export function table(data: Record<string, string>[]): void {
  if (data.length === 0) {
    return;
  }

  const headers = Object.keys(data[0]);
  const tableInstance = new Table({
    head: headers,
    style: {
      head: ["cyan"],
    },
  });

  for (const row of data) {
    tableInstance.push(headers.map((h) => row[h] ?? ""));
  }

  console.log(tableInstance.toString());
}

/**
 * エラーを安全に文字列化する
 */
export function stringifyError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}
