import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Claude Patterns設定ディレクトリのパスを取得
 */
export function getConfigDir(): string {
  return join(homedir(), ".claude-patterns");
}

/**
 * メトリクスファイルのパスを取得
 */
export function getMetricsPath(): string {
  return join(getConfigDir(), "metrics.yaml");
}
