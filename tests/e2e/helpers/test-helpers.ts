/**
 * E2Eテスト用ヘルパー関数
 */
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { spawn } from "node:child_process";
import yaml from "js-yaml";
import type {
  PatternCatalog,
  Config,
  PatternInput,
  Pattern,
  SessionEntry,
  UserEntry,
  AssistantEntry,
  ToolUseEntry,
  ToolResultEntry,
} from "../../../src/types/index.js";

/**
 * テスト用の一時環境を管理するクラス
 */
export class TestEnvironment {
  readonly baseDir: string;
  readonly patternsDir: string;
  readonly claudeDir: string;
  readonly projectDir: string;
  readonly originalHome: string;

  constructor() {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.baseDir = join(tmpdir(), `cpl-e2e-${uniqueId}`);
    this.patternsDir = join(this.baseDir, ".claude-patterns");
    this.claudeDir = join(this.baseDir, ".claude");
    this.projectDir = join(this.baseDir, "test-project");
    this.originalHome = homedir();
  }

  /**
   * テスト環境をセットアップ
   */
  async setup(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
    await mkdir(this.patternsDir, { recursive: true });
    await mkdir(this.claudeDir, { recursive: true });
    await mkdir(this.projectDir, { recursive: true });
  }

  /**
   * テスト環境をクリーンアップ
   */
  async cleanup(): Promise<void> {
    await rm(this.baseDir, { recursive: true, force: true });
  }

  /**
   * パターンカタログを作成
   */
  async createCatalog(patterns: Pattern[] = []): Promise<void> {
    const catalog: PatternCatalog = { patterns };
    const catalogPath = join(this.patternsDir, "patterns.yaml");
    await writeFile(catalogPath, yaml.dump(catalog), "utf-8");
  }

  /**
   * 設定ファイルを作成
   */
  async createConfig(config?: Partial<Config>): Promise<void> {
    const defaultConfig: Config = {
      version: 1,
      llm: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        api_key_env: "ANTHROPIC_API_KEY",
      },
      analysis: {
        auto_analyze: false,
        min_session_length: 5,
        exclude_patterns: [],
      },
      sync: {
        auto_sync: false,
        target_projects: [],
      },
    };
    const configPath = join(this.patternsDir, "config.yaml");
    await writeFile(configPath, yaml.dump({ ...defaultConfig, ...config }), "utf-8");
  }

  /**
   * セッションログを作成
   */
  async createSessionLog(
    sessionId: string,
    entries: SessionEntry[],
    projectPath?: string
  ): Promise<string> {
    const projectName = projectPath
      ? projectPath.replace(/\//g, "-").replace(/^-/, "")
      : "-home-test-project";
    const sessionsDir = join(this.claudeDir, "projects", projectName);
    await mkdir(sessionsDir, { recursive: true });

    const logPath = join(sessionsDir, `${sessionId}.jsonl`);
    const content = entries.map((e) => JSON.stringify(e)).join("\n");
    await writeFile(logPath, content, "utf-8");

    return logPath;
  }

  /**
   * CLAUDE.mdを作成
   */
  async createClaudeMd(path: string, content: string): Promise<void> {
    await writeFile(path, content, "utf-8");
  }

  /**
   * ファイル内容を読み込む
   */
  async readFile(path: string): Promise<string> {
    return await readFile(path, "utf-8");
  }

  /**
   * YAMLファイルを読み込む
   */
  async readYaml<T>(path: string): Promise<T | null> {
    try {
      const content = await readFile(path, "utf-8");
      return yaml.load(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * パターンカタログを読み込む
   */
  async readCatalog(): Promise<PatternCatalog> {
    const catalogPath = join(this.patternsDir, "patterns.yaml");
    const result = await this.readYaml<PatternCatalog>(catalogPath);
    return result ?? { patterns: [] };
  }
}

// SessionEntry型は types/session.ts から re-export
export type { SessionEntry, UserEntry, AssistantEntry, ToolUseEntry, ToolResultEntry };

/**
 * CLI実行結果
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** stdout + stderr の結合出力 */
  output: string;
}

/**
 * CLIを実行するヘルパー
 */
export async function runCli(
  args: string[],
  env: TestEnvironment,
  options: {
    input?: string;
    env?: Record<string, string>;
    cwd?: string;
    timeout?: number;
  } = {}
): Promise<CliResult> {
  const cliPath = join(process.cwd(), "dist", "index.js");

  return new Promise((resolve, reject) => {
    const proc = spawn("node", [cliPath, ...args], {
      cwd: options.cwd ?? env.projectDir,
      env: {
        ...process.env,
        HOME: env.baseDir,
        ...options.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    if (options.input) {
      proc.stdin.write(options.input);
      proc.stdin.end();
    }

    const timeout = options.timeout ?? 30000;
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`CLI execution timed out after ${timeout}ms`));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
        output: stdout + stderr,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * モックパターンを生成
 */
export function createMockPattern(overrides: Partial<Pattern> = {}): Pattern {
  const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  return {
    id,
    name: `テストパターン-${id.slice(0, 8)}`,
    type: "prompt",
    context: "これはテスト用のコンテキストです。",
    solution: "これはテスト用のソリューションです。",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * モックパターン入力を生成
 */
export function createMockPatternInput(overrides: Partial<PatternInput> = {}): PatternInput {
  const id = Math.random().toString(36).slice(2, 10);
  return {
    name: `テストパターン-${id}`,
    type: "prompt",
    context: "これはテスト用のコンテキストです。",
    solution: "これはテスト用のソリューションです。",
    ...overrides,
  };
}

/**
 * モックセッションログエントリを生成
 */
export function createMockSessionEntries(): SessionEntry[] {
  const now = new Date().toISOString();
  return [
    {
      type: "user",
      message: {
        role: "user",
        content: "TypeScriptでエラーハンドリングのベストプラクティスを教えて",
      },
      timestamp: now,
    } as UserEntry,
    {
      type: "assistant",
      message: {
        role: "assistant",
        content:
          "TypeScriptでのエラーハンドリングについて説明します。カスタムエラークラスを使用することで、エラーの種類を明確に区別できます...",
      },
      timestamp: now,
    } as AssistantEntry,
    {
      type: "tool_use",
      tool_name: "Write",
      tool_input: {
        file_path: "/src/errors.ts",
        content: "export class CustomError extends Error { ... }",
      },
      timestamp: now,
    } as ToolUseEntry,
    {
      type: "tool_result",
      tool_name: "Write",
      output: "ファイルを作成しました",
      timestamp: now,
    } as ToolResultEntry,
    {
      type: "user",
      message: {
        role: "user",
        content: "ありがとう。これをプロジェクト全体で使えるようにしたい",
      },
      timestamp: now,
    } as UserEntry,
    {
      type: "assistant",
      message: {
        role: "assistant",
        content:
          "エラーハンドリングユーティリティをエクスポートして、プロジェクト全体で使えるようにしました。",
      },
      timestamp: now,
    } as AssistantEntry,
  ];
}

/**
 * 機密情報を含むセッションログエントリを生成
 */
export function createSensitiveSessionEntries(): SessionEntry[] {
  const now = new Date().toISOString();
  return [
    {
      type: "user",
      message: {
        role: "user",
        content: "APIキーを設定して。キーは sk-1234567890abcdef です",
      },
      timestamp: now,
    } as UserEntry,
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: "APIキー sk-1234567890abcdef を設定しました。",
      },
      timestamp: now,
    } as AssistantEntry,
    {
      type: "tool_use",
      tool_name: "Write",
      tool_input: {
        file_path: ".env",
        content: "API_KEY=sk-1234567890abcdef\nPASSWORD=secret123",
      },
      timestamp: now,
    } as ToolUseEntry,
    {
      type: "tool_result",
      tool_name: "Write",
      output: ".envファイルを作成しました",
      timestamp: now,
    } as ToolResultEntry,
  ];
}

/**
 * パターンYAMLファイルを作成
 */
export async function createPatternYamlFile(
  dir: string,
  filename: string,
  pattern: PatternInput
): Promise<string> {
  const filePath = join(dir, filename);
  await writeFile(filePath, yaml.dump(pattern), "utf-8");
  return filePath;
}

/**
 * 不正なYAMLファイルを作成
 */
export async function createInvalidYamlFile(
  dir: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = join(dir, filename);
  await writeFile(filePath, content, "utf-8");
  return filePath;
}
