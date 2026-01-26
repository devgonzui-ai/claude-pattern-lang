import type { LLMClient } from "../client.js";
import type { TokenUsage, MetricsConfig } from "../../types/index.js";
import { MetricsCollector } from "./collector.js";
import type { TokenExtractor } from "./extractors/interface.js";

/**
 * メトリクス収集機能付きLLMクライアント
 */
export class MetricsCollectingClient implements LLMClient {
  private innerClient: LLMClient;
  private collector: MetricsCollector;
  private config: MetricsConfig;
  private provider: string;
  private model: string;
  private commandName: string;
  private tokenExtractor?: TokenExtractor;

  constructor(
    innerClient: LLMClient,
    collector: MetricsCollector,
    config: MetricsConfig,
    provider: string,
    model: string,
    commandName: string,
    tokenExtractor?: TokenExtractor
  ) {
    this.innerClient = innerClient;
    this.collector = collector;
    this.config = config;
    this.provider = provider;
    this.model = model;
    this.commandName = commandName;
    this.tokenExtractor = tokenExtractor;
  }

  /**
   * プロンプトを実行してメトリクスを収集
   */
  async complete(prompt: string): Promise<string> {
    this.collector.startLLMCall();

    try {
      const response = await this.innerClient.complete(prompt);

      // トークン使用量を抽出
      let tokenUsage: TokenUsage = {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        available: false,
      };

      if (this.config.track_tokens && this.tokenExtractor) {
        try {
          tokenUsage = this.tokenExtractor.extract(response);
        } catch {
          // 抽出失敗時はデフォルト値
        }
      }

      // メトリクスを記録
      this.collector.recordLLMMetrics(
        this.provider,
        this.model,
        tokenUsage,
        this.commandName
      );

      return response;
    } finally {
      // LLM呼び出し終了（タイミングはrecordLLMMetrics内で記録済み）
    }
  }
}
