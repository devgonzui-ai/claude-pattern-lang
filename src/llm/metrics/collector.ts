import type {
  CommandMetrics,
  LLMMetrics,
  TokenUsage,
} from "../../types/index.js";

/**
 * メトリクス収集クラス
 */
export class MetricsCollector {
  private llmMetrics: LLMMetrics[] = [];
  private commandStartTime: number = 0;
  private currentLLMStartTime: number = 0;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * セッションIDを取得
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * コマンド開始を記録
   */
  startCommand(_commandName: string): void {
    this.commandStartTime = performance.now();
  }

  /**
   * LLM呼び出し開始を記録
   */
  startLLMCall(): void {
    this.currentLLMStartTime = performance.now();
  }

  /**
   * LLMメトリクスを記録
   */
  recordLLMMetrics(
    provider: string,
    model: string,
    tokenUsage: TokenUsage,
    command: string
  ): LLMMetrics {
    const llmEndTime = performance.now();
    const llmDuration = llmEndTime - this.currentLLMStartTime;

    const metrics: LLMMetrics = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      token_usage: tokenUsage,
      performance: {
        llm_duration_ms: llmDuration,
        command_duration_ms: 0, // コマンド終了時に設定
        bottlenecks: [],
      },
      command,
      session_id: this.sessionId,
    };

    this.llmMetrics.push(metrics);
    return metrics;
  }

  /**
   * コマンド終了を記録
   */
  endCommand(commandName: string): CommandMetrics | null {
    const commandEndTime = performance.now();
    const commandDuration = commandEndTime - this.commandStartTime;

    const commandLLMMetrics = this.llmMetrics.filter(
      (m) => m.command === commandName
    );

    if (commandLLMMetrics.length === 0) {
      return null;
    }

    const totalTokens = commandLLMMetrics.reduce((sum, m) => {
      return sum + (m.token_usage.available ? m.token_usage.total_tokens : 0);
    }, 0);

    const avgResponse =
      commandLLMMetrics.reduce((sum, m) => sum + m.performance.llm_duration_ms, 0) /
      commandLLMMetrics.length;

    const firstMetric = commandLLMMetrics[0];

    const commandMetrics: CommandMetrics = {
      command: commandName,
      timestamp: new Date().toISOString(),
      duration_ms: commandDuration,
      llm_calls: commandLLMMetrics.length,
      total_tokens: totalTokens,
      avg_response_ms: avgResponse,
      session_id: this.sessionId,
      provider: firstMetric.provider,
      model: firstMetric.model,
    };

    return commandMetrics;
  }

  /**
   * LLMメトリクスを取得
   */
  getLLMMetrics(): LLMMetrics[] {
    return [...this.llmMetrics];
  }

  /**
   * ボトルネックを特定
   */
  identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const avgLLMDuration =
      this.llmMetrics.reduce((sum, m) => sum + m.performance.llm_duration_ms, 0) /
      (this.llmMetrics.length || 1);

    if (avgLLMDuration > 5000) {
      bottlenecks.push(`LLM応答が遅い (平均: ${(avgLLMDuration / 1000).toFixed(2)}s)`);
    }

    if (this.llmMetrics.length > 10) {
      bottlenecks.push(`LLM呼び出しが多い (${this.llmMetrics.length}回)`);
    }

    return bottlenecks;
  }

  /**
   * トータルトークン数を計算
   */
  getTotalTokens(): number {
    return this.llmMetrics.reduce((sum, m) => {
      return sum + (m.token_usage.available ? m.token_usage.total_tokens : 0);
    }, 0);
  }

  /**
   * 平均LLMレスポンス時間を計算
   */
  getAvgLLMResponse(): number {
    if (this.llmMetrics.length === 0) return 0;
    return (
      this.llmMetrics.reduce((sum, m) => sum + m.performance.llm_duration_ms, 0) /
      this.llmMetrics.length
    );
  }

  /**
   * クリア
   */
  clear(): void {
    this.llmMetrics = [];
    this.commandStartTime = 0;
    this.currentLLMStartTime = 0;
  }
}
