import { spawn } from "node:child_process";
import type { LLMClient } from "../client.js";
import { claudeCodeTokenExtractor } from "../metrics/extractors/claude-code.js";

/**
 * Claude CodeのCLIが利用可能かチェック
 */
export async function isClaudeCodeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["--version"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.on("error", () => {
      resolve(false);
    });

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    // タイムアウト（5秒）
    setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Claude Codeを使用してプロンプトを実行
 */
async function runClaudeCode(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // stdinを"ignore"にしないとclaudeコマンドが入力待ちで止まる
    const proc = spawn("claude", ["-p", prompt, "--output-format", "text"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`Claude Codeの実行に失敗しました: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `Claude Codeがエラーで終了しました (code: ${code}): ${stderr}`
          )
        );
      }
    });
  });
}

/**
 * Claude Code CLIを使用するLLMクライアントを作成
 * APIキーが不要で、Claude Code内で実行する場合に使用
 * @returns クライアントとトークン抽出器
 */
export function createClaudeCodeClient(): {
  client: LLMClient;
  extractor?: typeof claudeCodeTokenExtractor;
} {
  const client: LLMClient = {
    async complete(prompt: string): Promise<string> {
      // Claude Codeが利用可能かチェック
      const available = await isClaudeCodeAvailable();
      if (!available) {
        throw new Error(
          "Claude Code CLIが見つかりません。Claude Codeをインストールしてください。"
        );
      }

      return runClaudeCode(prompt);
    },
  };

  return {
    client,
    extractor: claudeCodeTokenExtractor,
  };
}
