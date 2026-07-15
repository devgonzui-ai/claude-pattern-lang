import { Command } from "commander";
import { loadCatalog, saveCatalog } from "../../core/catalog/store.js";
import {
  findSimilarPairs,
  DEFAULT_SIMILARITY_THRESHOLD,
  type SimilarPair,
} from "../../core/analyzer/deduplicator.js";
import {
  buildDedupePrompt,
  parseDedupeResponse,
  type DedupeJudgement,
} from "../../llm/prompts/detect-duplicates.js";
import { createLLMClient } from "../../llm/client.js";
import { fileExists, readYaml, getConfigPath } from "../../utils/fs.js";
import { info, success, warn, error, stringifyError } from "../../utils/logger.js";
import type { Config, LLMConfig, Pattern } from "../../types/index.js";
import { DEFAULT_CONFIG } from "../../types/config.js";
import * as readline from "node:readline";
import { t } from "../../i18n/index.js";

interface DedupeOptions {
  threshold?: string;
  limit?: string;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * 一度にLLMへ判定を依頼する最大ペア数
 */
const DEFAULT_PAIR_LIMIT = 10;

/**
 * ユーザーに確認を求める
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

/**
 * ペアの表示用ラベルを生成する
 */
function pairLabel(pair: SimilarPair): Record<string, string | number> {
  return {
    shortIdA: pair.a.id.slice(0, 8),
    nameA: pair.a.name,
    shortIdB: pair.b.id.slice(0, 8),
    nameB: pair.b.name,
    similarity: Math.round(pair.similarity * 100),
  };
}

/**
 * 重複ペアをマージする
 * パターンAを残してLLMの提案内容で更新し、パターンBを削除する
 */
function mergePair(
  patterns: Pattern[],
  pair: SimilarPair,
  judgement: DedupeJudgement
): Pattern[] {
  const keep = patterns.find((p) => p.id === pair.a.id);
  if (!keep) {
    return patterns;
  }

  const merged = judgement.merged;
  if (merged) {
    keep.name = merged.name;
    keep.type = merged.type;
    keep.context = merged.context;
    keep.solution = merged.solution;
    if (merged.problem !== undefined) {
      keep.problem = merged.problem;
    }
    if (merged.example !== undefined) {
      keep.example = merged.example;
    }
    if (merged.example_prompt !== undefined) {
      keep.example_prompt = merged.example_prompt;
    }
  }

  // タグ・抽出元セッション・使用回数は両者を統合する
  const mergedTags = new Set([
    ...(keep.tags ?? []),
    ...(pair.b.tags ?? []),
    ...(merged?.tags ?? []),
  ]);
  if (mergedTags.size > 0) {
    keep.tags = [...mergedTags];
  }

  const mergedSessions = new Set([
    ...(keep.source_sessions ?? []),
    ...(pair.b.source_sessions ?? []),
  ]);
  if (mergedSessions.size > 0) {
    keep.source_sessions = [...mergedSessions];
  }

  if (keep.usage_count !== undefined || pair.b.usage_count !== undefined) {
    keep.usage_count = (keep.usage_count ?? 0) + (pair.b.usage_count ?? 0);
  }

  keep.updated_at = new Date().toISOString();

  return patterns.filter((p) => p.id !== pair.b.id);
}

/**
 * dedupeコマンドのアクションハンドラ
 * テスト用にエクスポート
 */
export async function dedupeAction(options: DedupeOptions): Promise<void> {
  try {
    // オプションのバリデーション
    const threshold =
      options.threshold !== undefined
        ? Number(options.threshold)
        : DEFAULT_SIMILARITY_THRESHOLD;
    if (Number.isNaN(threshold) || threshold <= 0 || threshold > 1) {
      error(t("messages.dedupe.invalidThreshold"));
      return;
    }

    const limit =
      options.limit !== undefined ? Number(options.limit) : DEFAULT_PAIR_LIMIT;
    if (!Number.isInteger(limit) || limit < 1) {
      error(t("messages.dedupe.invalidLimit"));
      return;
    }

    // パターンカタログを読み込む
    const catalog = await loadCatalog();

    if (catalog.patterns.length < 2) {
      warn(t("messages.dedupe.notEnoughPatterns"));
      return;
    }

    info(t("messages.dedupe.scanning", { count: catalog.patterns.length }));

    // 字句類似度で候補ペアを抽出（LLM判定の前段フィルタ）
    const pairs = findSimilarPairs(catalog.patterns, threshold).slice(0, limit);

    if (pairs.length === 0) {
      success(t("messages.dedupe.noCandidates"));
      return;
    }

    info(t("messages.dedupe.candidates", { count: pairs.length }));
    for (const pair of pairs) {
      info(t("messages.dedupe.candidateItem", pairLabel(pair)));
    }

    // 設定を読み込み
    let llmConfig: LLMConfig = DEFAULT_CONFIG.llm;
    const configPath = getConfigPath();
    if (await fileExists(configPath)) {
      const config = await readYaml<Config>(configPath);
      if (config) {
        llmConfig = config.llm || DEFAULT_CONFIG.llm;
      }
    }

    // LLMに意味的な重複判定を依頼
    info(t("messages.dedupe.judging", { provider: llmConfig.provider, model: llmConfig.model }));
    const client = await createLLMClient(llmConfig, { commandName: "dedupe" });
    const response = await client.complete(buildDedupePrompt(pairs));
    const judgements = parseDedupeResponse(response, pairs.length);

    const duplicates = judgements.filter((j) => j.duplicate);

    if (duplicates.length === 0) {
      success(t("messages.dedupe.noDuplicates"));
      return;
    }

    info(t("messages.dedupe.duplicates", { count: duplicates.length }));

    // 各重複ペアについてマージ提案を表示・適用
    let patterns = [...catalog.patterns];
    const removedIds = new Set<string>();
    let mergedCount = 0;

    for (const judgement of duplicates) {
      const pair = pairs[judgement.pair - 1];

      // 先行するマージで片方が消えている場合はスキップ
      if (removedIds.has(pair.a.id) || removedIds.has(pair.b.id)) {
        continue;
      }

      info(t("messages.dedupe.proposal", pairLabel(pair)));
      if (judgement.reason) {
        info(t("messages.dedupe.reason", { reason: judgement.reason }));
      }
      info(t("messages.dedupe.keep", {
        shortId: pair.a.id.slice(0, 8),
        name: judgement.merged?.name ?? pair.a.name,
      }));
      info(t("messages.dedupe.remove", {
        shortId: pair.b.id.slice(0, 8),
        name: pair.b.name,
      }));

      // dry-runの場合は表示のみ
      if (options.dryRun) {
        continue;
      }

      // 確認
      if (!options.force) {
        const shouldMerge = await confirm(t("messages.dedupe.confirm"));
        if (!shouldMerge) {
          info(t("messages.dedupe.skippedPair"));
          continue;
        }
      }

      patterns = mergePair(patterns, pair, judgement);
      removedIds.add(pair.b.id);
      mergedCount++;
    }

    // dry-runの場合は保存しない
    if (options.dryRun) {
      info(t("messages.dedupe.dryRun"));
      return;
    }

    if (mergedCount === 0) {
      info(t("messages.dedupe.nothingMerged"));
      return;
    }

    catalog.patterns = patterns;
    await saveCatalog(catalog);

    success(t("messages.dedupe.merged", { count: mergedCount }));

    // sync/export済みファイルの再生成を案内
    info(t("messages.dedupe.resyncHint"));
  } catch (err) {
    error(t("messages.dedupe.error", { error: stringifyError(err) }));
  }
}

/**
 * 類似パターン統合コマンド
 */
export const dedupeCommand = new Command("dedupe")
  .description(t("cli.commands.dedupe.description"))
  .option("--threshold <n>", t("cli.commands.dedupe.options.threshold"))
  .option("--limit <n>", t("cli.commands.dedupe.options.limit"))
  .option("--dry-run", t("cli.commands.dedupe.options.dryRun"))
  .option("--force", t("cli.commands.dedupe.options.force"))
  .action(dedupeAction);
