import { describe, it, expect, vi, beforeEach } from "vitest";
// analyzeコマンドはCLIの統合テストがメインなので、ここではユニットテストの範囲を限定
// 実際の動作はE2Eテストでカバー

describe("analyzeCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip("セッション一覧を表示できる", async () => {
    // E2Eテストでカバー
  });

  it.skip("--dry-runオプションでパターン保存をスキップする", async () => {
    // E2Eテストでカバー
  });
});
