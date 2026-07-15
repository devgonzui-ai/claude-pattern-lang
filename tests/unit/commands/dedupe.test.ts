import { describe, it, expect, vi, beforeEach } from "vitest";
import { dedupeAction } from "../../../src/cli/commands/dedupe.js";
import * as store from "../../../src/core/catalog/store.js";
import * as llmClient from "../../../src/llm/client.js";
import * as logger from "../../../src/utils/logger.js";
import * as fs from "../../../src/utils/fs.js";
import type { Pattern } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  loadCatalog: vi.fn(),
  saveCatalog: vi.fn(),
}));

vi.mock("../../../src/llm/client.js", () => ({
  createLLMClient: vi.fn(),
}));

vi.mock("../../../src/utils/fs.js", async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    fileExists: vi.fn().mockResolvedValue(false),
  };
});

vi.mock("../../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  stringifyError: vi.fn((err: unknown) => String(err)),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: vi.fn((key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "messages.dedupe.notEnoughPatterns": "Need at least 2 patterns to deduplicate.",
      "messages.dedupe.invalidThreshold": "--threshold must be a number between 0 and 1.",
      "messages.dedupe.invalidLimit": "--limit must be a positive integer.",
      "messages.dedupe.scanning": `Scanning ${params?.count} pattern(s)...`,
      "messages.dedupe.noCandidates": "No similar pattern pairs found.",
      "messages.dedupe.candidates": `${params?.count} candidate pair(s) found:`,
      "messages.dedupe.candidateItem": `  ${params?.nameA} <-> ${params?.nameB} (${params?.similarity}%)`,
      "messages.dedupe.judging": "Asking LLM...",
      "messages.dedupe.noDuplicates": "LLM judged no pairs as semantic duplicates.",
      "messages.dedupe.duplicates": `${params?.count} pair(s) judged as duplicates:`,
      "messages.dedupe.proposal": `Merge proposal: ${params?.nameA} <-> ${params?.nameB}`,
      "messages.dedupe.reason": `Reason: ${params?.reason}`,
      "messages.dedupe.keep": `Keep: ${params?.name}`,
      "messages.dedupe.remove": `Remove: ${params?.name}`,
      "messages.dedupe.confirm": "Merge this pair?",
      "messages.dedupe.skippedPair": "Skipped.",
      "messages.dedupe.dryRun": "[dry-run] Patterns were not merged.",
      "messages.dedupe.nothingMerged": "No pairs were merged.",
      "messages.dedupe.merged": `Merged ${params?.count} pair(s).`,
      "messages.dedupe.resyncHint": "Run `cpl sync` / `cpl export` to update synced files.",
      "messages.dedupe.error": `Error: ${params?.error}`,
    };
    return messages[key] || key;
  }),
}));

/**
 * 類似ペアとして検出されるパターン2件＋無関係な1件
 */
const similarA: Pattern = {
  id: "aaaaaaaa-0000-0000-0000-000000000000",
  name: "エラーログ確認手順",
  type: "solution",
  context: "エラーが報告されたときにログを確認する",
  solution: "まずエラーログの提示を依頼し、原因を特定する",
  tags: ["debug"],
  usage_count: 2,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const similarB: Pattern = {
  id: "bbbbbbbb-0000-0000-0000-000000000000",
  name: "エラーログ確認の手順",
  type: "solution",
  context: "エラーが報告されたときにログを確認する",
  solution: "まずエラーログの提示を依頼して、原因を特定する",
  tags: ["debugging"],
  usage_count: 1,
  source_sessions: ["session-b"],
  created_at: "2024-02-01T00:00:00Z",
  updated_at: "2024-02-01T00:00:00Z",
};

const unrelated: Pattern = {
  id: "cccccccc-0000-0000-0000-000000000000",
  name: "react-form-controlled-components",
  type: "code",
  context: "Reactでフォームを作成する場合",
  solution: "useStateでフォームデータを単一のオブジェクトとして管理する",
  tags: ["react"],
  created_at: "2024-03-01T00:00:00Z",
  updated_at: "2024-03-01T00:00:00Z",
};

const duplicateResponse = `\`\`\`yaml
judgements:
  - pair: 1
    duplicate: true
    reason: 同じデバッグ手順
    merged:
      name: エラーログ先行確認
      type: solution
      context: エラーが報告されたときにログを確認する
      solution: まずエラーログの提示を依頼し、具体的な内容から原因を特定する
      tags: [debug, communication]
\`\`\``;

describe("dedupeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.fileExists).mockResolvedValue(false);
  });

  it("重複ペアをマージして保存する（force）", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [similarA, similarB, unrelated].map((p) => ({ ...p })),
    });
    vi.mocked(llmClient.createLLMClient).mockResolvedValue({
      complete: vi.fn().mockResolvedValue(duplicateResponse),
    });

    await dedupeAction({ force: true });

    expect(store.saveCatalog).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(store.saveCatalog).mock.calls[0][0];
    expect(saved.patterns).toHaveLength(2);

    const merged = saved.patterns.find((p) => p.id === similarA.id);
    expect(merged).toBeDefined();
    expect(merged?.name).toBe("エラーログ先行確認");
    // タグは両者＋提案の統合
    expect(merged?.tags).toEqual(
      expect.arrayContaining(["debug", "debugging", "communication"])
    );
    // usage_countは合算
    expect(merged?.usage_count).toBe(3);
    // source_sessionsは引き継ぐ
    expect(merged?.source_sessions).toContain("session-b");
    // Bは削除されている
    expect(saved.patterns.some((p) => p.id === similarB.id)).toBe(false);

    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Merged 1"));
  });

  it("dry-runでは保存しない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [similarA, similarB].map((p) => ({ ...p })),
    });
    vi.mocked(llmClient.createLLMClient).mockResolvedValue({
      complete: vi.fn().mockResolvedValue(duplicateResponse),
    });

    await dedupeAction({ dryRun: true });

    expect(store.saveCatalog).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("dry-run"));
  });

  it("LLMが重複なしと判定したら保存しない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [similarA, similarB].map((p) => ({ ...p })),
    });
    vi.mocked(llmClient.createLLMClient).mockResolvedValue({
      complete: vi.fn().mockResolvedValue(`\`\`\`yaml
judgements:
  - pair: 1
    duplicate: false
    reason: 対象が異なる
\`\`\``),
    });

    await dedupeAction({ force: true });

    expect(store.saveCatalog).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(
      expect.stringContaining("no pairs as semantic duplicates")
    );
  });

  it("候補ペアがなければLLMを呼ばない", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [{ ...similarA }, { ...unrelated }],
    });

    await dedupeAction({ force: true });

    expect(llmClient.createLLMClient).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(
      expect.stringContaining("No similar pattern pairs")
    );
  });

  it("パターンが2件未満なら警告する", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({ patterns: [{ ...similarA }] });

    await dedupeAction({});

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("at least 2 patterns")
    );
    expect(llmClient.createLLMClient).not.toHaveBeenCalled();
  });

  it("不正なthresholdはエラーを表示する", async () => {
    await dedupeAction({ threshold: "abc" });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("threshold"));

    await dedupeAction({ threshold: "1.5" });
    expect(logger.error).toHaveBeenCalledTimes(2);

    expect(store.loadCatalog).not.toHaveBeenCalled();
  });

  it("不正なlimitはエラーを表示する", async () => {
    await dedupeAction({ limit: "0" });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("limit"));
    expect(store.loadCatalog).not.toHaveBeenCalled();
  });

  it("mergedが不正でもパターンBの削除は行う", async () => {
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [similarA, similarB].map((p) => ({ ...p })),
    });
    vi.mocked(llmClient.createLLMClient).mockResolvedValue({
      complete: vi.fn().mockResolvedValue(`\`\`\`yaml
judgements:
  - pair: 1
    duplicate: true
\`\`\``),
    });

    await dedupeAction({ force: true });

    const saved = vi.mocked(store.saveCatalog).mock.calls[0][0];
    expect(saved.patterns).toHaveLength(1);
    // 提案がないのでAの内容は維持
    expect(saved.patterns[0].name).toBe(similarA.name);
  });
});
