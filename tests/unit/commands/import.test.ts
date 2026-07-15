import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import yaml from "js-yaml";
import { importAction } from "../../../src/cli/commands/import.js";
import * as store from "../../../src/core/catalog/store.js";
import * as fs from "../../../src/utils/fs.js";
import * as logger from "../../../src/utils/logger.js";
import type { Pattern } from "../../../src/types/index.js";

// モック
vi.mock("../../../src/core/catalog/store.js", () => ({
  loadCatalog: vi.fn(),
  saveCatalog: vi.fn(),
  addPattern: vi.fn(),
}));

vi.mock("../../../src/utils/fs.js", () => ({
  fileExists: vi.fn(),
  readTextFile: vi.fn(),
}));

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
      "messages.import.fetching": `Loading patterns from ${params?.source}...`,
      "messages.import.fetchError": `Failed to load "${params?.source}": ${params?.error}`,
      "messages.import.sourceNotFound": `Source "${params?.source}" not found.`,
      "messages.import.parseError": `Failed to parse content: ${params?.error}`,
      "messages.import.invalidSkipped": `Skipped ${params?.count} invalid entrie(s).`,
      "messages.import.noPatterns": "No importable patterns found.",
      "messages.import.summary": `${params?.total} pattern(s) found: ${params?.new} new, ${params?.duplicates} duplicate(s).`,
      "messages.import.newItem": `  + ${params?.name} (${params?.type})`,
      "messages.import.overwriteItem": `  ~ ${params?.name} (overwrite)`,
      "messages.import.skipItem": `  - ${params?.name} (skip: already exists)`,
      "messages.import.nothingToImport": "Nothing to import.",
      "messages.import.dryRun": "[dry-run] Patterns were not imported.",
      "messages.import.confirm": `Import ${params?.count} pattern(s)?`,
      "messages.import.cancelled": "Import cancelled.",
      "messages.import.imported": `Imported ${params?.count} pattern(s).`,
      "messages.import.resyncHint": "Run `cpl sync` / `cpl export` to update synced files.",
      "messages.import.error": `Error: ${params?.error}`,
    };
    return messages[key] || key;
  }),
}));

const existingPattern: Pattern = {
  id: "1",
  name: "existing-pattern",
  type: "solution",
  context: "既存コンテキスト",
  solution: "既存ソリューション",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const shareContent = yaml.dump({
  version: 1,
  exported_at: "2026-01-01T00:00:00Z",
  patterns: [
    { name: "new-pattern", type: "code", context: "c1", solution: "s1" },
    { name: "Existing-Pattern", type: "prompt", context: "c2", solution: "s2" },
  ],
});

describe("importAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.fileExists).mockResolvedValue(true);
    vi.mocked(fs.readTextFile).mockResolvedValue(shareContent);
    vi.mocked(store.loadCatalog).mockResolvedValue({
      patterns: [{ ...existingPattern }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("新規パターンをインポートし、同名パターンはスキップする（force）", async () => {
    await importAction("/path/to/share.yaml", { force: true });

    expect(store.addPattern).toHaveBeenCalledTimes(1);
    expect(store.addPattern).toHaveBeenCalledWith(
      expect.objectContaining({ name: "new-pattern" })
    );
    // スキップのみなのでsaveCatalogは呼ばれない
    expect(store.saveCatalog).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Imported 1"));
  });

  it("--overwriteで同名パターンを上書き更新する", async () => {
    await importAction("/path/to/share.yaml", { force: true, overwrite: true });

    expect(store.addPattern).toHaveBeenCalledTimes(1);
    expect(store.saveCatalog).toHaveBeenCalledTimes(1);

    const saved = vi.mocked(store.saveCatalog).mock.calls[0][0];
    const updated = saved.patterns.find((p) => p.id === "1");
    expect(updated?.context).toBe("c2");
    expect(updated?.type).toBe("prompt");
    // 上書きでもIDと作成日時は維持
    expect(updated?.created_at).toBe("2024-01-01T00:00:00Z");
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Imported 2"));
  });

  it("dry-runではインポートしない", async () => {
    await importAction("/path/to/share.yaml", { dryRun: true });

    expect(store.addPattern).not.toHaveBeenCalled();
    expect(store.saveCatalog).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("dry-run"));
  });

  it("URLからインポートできる", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(shareContent),
    });
    vi.stubGlobal("fetch", fetchMock);

    await importAction("https://example.com/patterns.yaml", { force: true });

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/patterns.yaml");
    expect(store.addPattern).toHaveBeenCalledTimes(1);
  });

  it("URL取得に失敗したらエラーを表示する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });
    vi.stubGlobal("fetch", fetchMock);

    await importAction("https://example.com/missing.yaml", { force: true });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to load"));
    expect(store.addPattern).not.toHaveBeenCalled();
  });

  it("ファイルが存在しない場合はエラーを表示する", async () => {
    vi.mocked(fs.fileExists).mockResolvedValue(false);

    await importAction("/missing.yaml", { force: true });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to load"));
    expect(store.addPattern).not.toHaveBeenCalled();
  });

  it("パースできないコンテンツはエラーを表示する", async () => {
    vi.mocked(fs.readTextFile).mockResolvedValue("just a string");

    await importAction("/path/to/share.yaml", { force: true });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to parse"));
  });

  it("不正なエントリは警告してスキップする", async () => {
    vi.mocked(fs.readTextFile).mockResolvedValue(
      yaml.dump({
        patterns: [
          { name: "valid", type: "solution", context: "c", solution: "s" },
          { name: "invalid" },
        ],
      })
    );

    await importAction("/path/to/share.yaml", { force: true });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Skipped 1 invalid"));
    expect(store.addPattern).toHaveBeenCalledTimes(1);
  });

  it("全て重複でoverwriteなしなら何もインポートしない", async () => {
    vi.mocked(fs.readTextFile).mockResolvedValue(
      yaml.dump({
        patterns: [
          { name: "existing-pattern", type: "solution", context: "c", solution: "s" },
        ],
      })
    );

    await importAction("/path/to/share.yaml", { force: true });

    expect(store.addPattern).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Nothing to import"));
  });
});
