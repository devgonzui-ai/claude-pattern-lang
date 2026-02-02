import { Command } from "commander";
import { promises as fs } from "node:fs";
import * as readline from "node:readline";
import * as path from "node:path";
import { info, error, success, stringifyError } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";

interface SessionOptions {
  project?: string;
  all?: boolean;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreation: number;
  cacheRead: number;
  messageCount: number;
}

interface SessionAnalysis {
  sessionId: string;
  filePath: string;
  usage: TokenUsage;
  cacheEfficiency: number;
}

/**
 * Claude Codeのセッションログディレクトリを取得
 */
function getClaudeSessionsDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(homeDir, ".claude", "projects");
}

/**
 * プロジェクトパスをClaude Code形式に変換
 * /home/user/work/project -> -home-user-work-project
 */
function projectPathToClaudeDir(projectPath: string): string {
  const absolutePath = path.resolve(projectPath);
  return absolutePath.replace(/\//g, "-").replace(/^-/, "-");
}

/**
 * セッションファイルを分析
 */
async function analyzeSessionFile(filePath: string): Promise<TokenUsage> {
  const fileStream = await fs.open(filePath, "r");
  const rl = readline.createInterface({
    input: fileStream.createReadStream(),
    crlfDelay: Infinity,
  });

  const usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreation: 0,
    cacheRead: 0,
    messageCount: 0,
  };

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.message?.usage) {
        const u = obj.message.usage;
        usage.inputTokens += u.input_tokens || 0;
        usage.outputTokens += u.output_tokens || 0;
        usage.cacheCreation += u.cache_creation_input_tokens || 0;
        usage.cacheRead += u.cache_read_input_tokens || 0;
        usage.messageCount++;
      }
    } catch {
      // JSON parse error, skip line
    }
  }

  await fileStream.close();
  return usage;
}

/**
 * キャッシュ効率を計算
 */
function calculateCacheEfficiency(usage: TokenUsage): number {
  const total = usage.cacheRead + usage.cacheCreation;
  if (total === 0) return 0;
  return (usage.cacheRead / total) * 100;
}

/**
 * セッション分析結果を表示
 */
function displaySessionAnalysis(analysis: SessionAnalysis): void {
  const { usage, cacheEfficiency, sessionId } = analysis;

  console.log(`\n📊 Session: ${sessionId}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Messages:         ${usage.messageCount}`);
  console.log(`Input Tokens:     ${usage.inputTokens.toLocaleString()}`);
  console.log(`Output Tokens:    ${usage.outputTokens.toLocaleString()}`);
  console.log(`Cache Creation:   ${usage.cacheCreation.toLocaleString()}`);
  console.log(`Cache Read:       ${usage.cacheRead.toLocaleString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Cache Efficiency: ${cacheEfficiency.toFixed(1)}%`);
}

/**
 * 複数セッションのサマリーを表示
 */
function displaySummary(analyses: SessionAnalysis[]): void {
  if (analyses.length === 0) return;

  const totals = analyses.reduce(
    (acc, a) => ({
      messages: acc.messages + a.usage.messageCount,
      input: acc.input + a.usage.inputTokens,
      output: acc.output + a.usage.outputTokens,
      cacheCreation: acc.cacheCreation + a.usage.cacheCreation,
      cacheRead: acc.cacheRead + a.usage.cacheRead,
    }),
    { messages: 0, input: 0, output: 0, cacheCreation: 0, cacheRead: 0 }
  );

  const totalCache = totals.cacheRead + totals.cacheCreation;
  const avgEfficiency = totalCache > 0 ? (totals.cacheRead / totalCache) * 100 : 0;

  console.log("\n📈 Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Sessions:         ${analyses.length}`);
  console.log(`Total Messages:   ${totals.messages}`);
  console.log(`Total Input:      ${totals.input.toLocaleString()}`);
  console.log(`Total Output:     ${totals.output.toLocaleString()}`);
  console.log(`Total Cache:      ${(totals.cacheRead + totals.cacheCreation).toLocaleString()}`);
  console.log(`Avg Efficiency:   ${avgEfficiency.toFixed(1)}%`);
}

/**
 * セッション分析コマンドのアクション
 */
async function sessionAction(
  sessionFile: string | undefined,
  options: SessionOptions
): Promise<void> {
  try {
    const sessionsDir = getClaudeSessionsDir();

    // 特定のセッションファイルが指定された場合
    if (sessionFile) {
      const filePath = path.resolve(sessionFile);
      const usage = await analyzeSessionFile(filePath);
      const sessionId = path.basename(filePath, ".jsonl");
      const cacheEfficiency = calculateCacheEfficiency(usage);

      displaySessionAnalysis({ sessionId, filePath, usage, cacheEfficiency });
      return;
    }

    // プロジェクト指定の場合
    let targetDir: string;
    if (options.project) {
      const claudeDir = projectPathToClaudeDir(options.project);
      targetDir = path.join(sessionsDir, claudeDir);
    } else {
      // カレントディレクトリのプロジェクト
      const claudeDir = projectPathToClaudeDir(process.cwd());
      targetDir = path.join(sessionsDir, claudeDir);
    }

    // ディレクトリ存在チェック
    try {
      await fs.access(targetDir);
    } catch {
      error(t("messages.session.dirNotFound", { path: targetDir }));
      info(t("messages.session.checkProject"));
      return;
    }

    // セッションファイル一覧を取得
    const files = await fs.readdir(targetDir);
    const jsonlFiles = files
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(targetDir, f));

    if (jsonlFiles.length === 0) {
      info(t("messages.session.noSessions"));
      return;
    }

    // ファイルを更新日時でソート（新しい順）
    const filesWithStats = await Promise.all(
      jsonlFiles.map(async (f) => ({
        path: f,
        mtime: (await fs.stat(f)).mtime,
      }))
    );
    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // 全セッション or 最新のみ
    const targetFiles = options.all
      ? filesWithStats.map((f) => f.path)
      : [filesWithStats[0].path];

    const analyses: SessionAnalysis[] = [];

    for (const filePath of targetFiles) {
      const usage = await analyzeSessionFile(filePath);
      if (usage.messageCount === 0) continue; // 空のセッションはスキップ

      const sessionId = path.basename(filePath, ".jsonl");
      const cacheEfficiency = calculateCacheEfficiency(usage);
      analyses.push({ sessionId, filePath, usage, cacheEfficiency });
    }

    if (analyses.length === 0) {
      info(t("messages.session.noAnalyzable"));
      return;
    }

    // 結果表示
    for (const analysis of analyses) {
      displaySessionAnalysis(analysis);
    }

    if (analyses.length > 1) {
      displaySummary(analyses);
    }

    success(`\n${t("messages.session.analyzed", { count: analyses.length })}`);
  } catch (err) {
    error(t("messages.session.error", { error: stringifyError(err) }));
  }
}

/**
 * Claude Codeセッション分析コマンド
 */
export const sessionCommand = new Command("session")
  .description(t("cli.commands.session.description"))
  .argument("[session-file]", t("cli.commands.session.argument"))
  .option("-p, --project <path>", t("cli.commands.session.options.project"))
  .option("-a, --all", t("cli.commands.session.options.all"))
  .action(sessionAction);
