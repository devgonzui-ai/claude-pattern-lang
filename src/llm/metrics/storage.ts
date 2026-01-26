import { promises as fs } from "node:fs";
import yaml from "js-yaml";
import type {
  CommandMetrics,
  LLMMetrics,
  MetricsStorage as MetricsStorageType,
  MetricsStatistics,
  MetricsConfig,
} from "../../types/index.js";
import { getMetricsPath } from "../../utils/paths.js";

/**
 * メトリクスストレージバージョン
 */
const STORAGE_VERSION = 1;

/**
 * メトリクスストレージクラス
 */
export class MetricsStorage {
  private path: string;

  constructor(path?: string) {
    this.path = path || getMetricsPath();
  }

  /**
   * メトリクスを読み込む
   */
  async load(): Promise<MetricsStorageType> {
    try {
      const content = await fs.readFile(this.path, "utf-8");
      const data = yaml.load(content) as MetricsStorageType;

      // バージョンチェック
      if (!data || data.version !== STORAGE_VERSION) {
        return this.createEmptyStorage();
      }

      return data;
    } catch (err) {
      // ファイルが存在しない場合は空のストレージを返す
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return this.createEmptyStorage();
      }
      throw err;
    }
  }

  /**
   * メトリクスを保存
   */
  async save(storage: MetricsStorageType): Promise<void> {
    const dir = this.path.substring(0, this.path.lastIndexOf("/"));
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // ディレクトリ作成エラーは無視
    }

    const content = yaml.dump(storage, { lineWidth: -1 });
    await fs.writeFile(this.path, content, "utf-8");
  }

  /**
   * LLMメトリクスを追加
   */
  async addLLMMetrics(metrics: LLMMetrics[]): Promise<void> {
    const storage = await this.load();
    storage.metrics.push(...metrics);
    await this.save(storage);
  }

  /**
   * コマンドメトリクスを追加
   */
  async addCommandMetrics(command: CommandMetrics): Promise<void> {
    const storage = await this.load();
    storage.commands.push(command);
    await this.save(storage);
  }

  /**
   * メトリクスをクリア
   */
  async clear(): Promise<void> {
    const emptyStorage = this.createEmptyStorage();
    await this.save(emptyStorage);
  }

  /**
   * 保持期間に基づいて古いメトリクスを削除
   */
  async applyRetention(config: MetricsConfig): Promise<void> {
    if (config.retention_days <= 0) return;

    const storage = await this.load();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retention_days);

    storage.metrics = storage.metrics.filter((m) => {
      const metricDate = new Date(m.timestamp);
      return metricDate > cutoffDate;
    });

    storage.commands = storage.commands.filter((c) => {
      const commandDate = new Date(c.timestamp);
      return commandDate > cutoffDate;
    });

    await this.save(storage);
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(days: number = 7): Promise<MetricsStatistics> {
    const storage = await this.load();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentCommands = storage.commands.filter((c) => {
      const commandDate = new Date(c.timestamp);
      return commandDate > cutoffDate;
    });

    const recentMetrics = storage.metrics.filter((m) => {
      const metricDate = new Date(m.timestamp);
      return metricDate > cutoffDate;
    });

    const totalTokens = recentCommands.reduce((sum, c) => sum + c.total_tokens, 0);
    const totalDuration = recentCommands.reduce((sum, c) => sum + c.duration_ms, 0);

    const avgResponse =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.performance.llm_duration_ms, 0) /
          recentMetrics.length
        : 0;

    return {
      commands: recentCommands.length,
      llm_calls: recentMetrics.length,
      total_tokens: totalTokens,
      avg_response_ms: avgResponse,
      total_duration_ms: totalDuration,
    };
  }

  /**
   * コマンド履歴を取得
   */
  async getRecentCommands(limit: number = 20): Promise<CommandMetrics[]> {
    const storage = await this.load();
    return storage.commands.slice(-limit).reverse();
  }

  /**
   * 空のストレージを作成
   */
  private createEmptyStorage(): MetricsStorageType {
    return {
      version: STORAGE_VERSION,
      metrics: [],
      commands: [],
    };
  }
}
