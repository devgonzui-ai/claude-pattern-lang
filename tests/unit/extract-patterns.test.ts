import { describe, it, expect } from "vitest";
import {
  buildExtractPrompt,
  parseExtractResponse,
} from "../../src/llm/prompts/extract-patterns.js";

describe("extract-patterns", () => {
  describe("buildExtractPrompt", () => {
    it("セッション内容を含むプロンプトを生成する", () => {
      const sessionContent = "User: Hello\nAssistant: Hi there!";
      const prompt = buildExtractPrompt(sessionContent);

      expect(prompt).toContain("パターン分析専門家");
      expect(prompt).toContain(sessionContent);
    });

    it("プロンプトにYAML形式の出力指示を含む", () => {
      const prompt = buildExtractPrompt("test content");

      expect(prompt).toContain("YAML形式");
      expect(prompt).toContain("patterns:");
    });

    it("プロンプトに3つのパターンタイプの説明を含む", () => {
      const prompt = buildExtractPrompt("test content");

      expect(prompt).toContain("type: prompt");
      expect(prompt).toContain("type: solution");
      expect(prompt).toContain("type: code");
    });

    it("機密情報に関する注意事項を含む", () => {
      const prompt = buildExtractPrompt("test content");

      expect(prompt).toContain("機密情報");
      expect(prompt).toContain("APIキー");
    });
  });

  describe("parseExtractResponse", () => {
    it("有効なYAMLレスポンスをPatternInput配列にパースする", () => {
      const yamlResponse = `
\`\`\`yaml
patterns:
  - name: テストパターン
    type: prompt
    context: テスト用のコンテキスト
    solution: テスト用の解決策
    tags: [test, example]
\`\`\`
`;

      const patterns = parseExtractResponse(yamlResponse);

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual({
        name: "テストパターン",
        type: "prompt",
        context: "テスト用のコンテキスト",
        solution: "テスト用の解決策",
        tags: ["test", "example"],
      });
    });

    it("複数のパターンを含むレスポンスをパースする", () => {
      const yamlResponse = `
\`\`\`yaml
patterns:
  - name: パターン1
    type: prompt
    context: コンテキスト1
    solution: 解決策1
  - name: パターン2
    type: solution
    context: コンテキスト2
    solution: 解決策2
\`\`\`
`;

      const patterns = parseExtractResponse(yamlResponse);

      expect(patterns).toHaveLength(2);
      expect(patterns[0].name).toBe("パターン1");
      expect(patterns[1].name).toBe("パターン2");
    });

    it("空のパターン配列を返す場合", () => {
      const yamlResponse = `
\`\`\`yaml
patterns: []
\`\`\`
`;

      const patterns = parseExtractResponse(yamlResponse);

      expect(patterns).toHaveLength(0);
    });

    it("YAMLコードブロックなしのレスポンスもパースする", () => {
      const yamlResponse = `
patterns:
  - name: 直接YAMLパターン
    type: code
    context: 直接YAMLコンテキスト
    solution: 直接YAML解決策
`;

      const patterns = parseExtractResponse(yamlResponse);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe("直接YAMLパターン");
    });

    it("無効なYAMLの場合は空配列を返す", () => {
      const invalidYaml = "this is not valid yaml: [[[";

      const patterns = parseExtractResponse(invalidYaml);

      expect(patterns).toHaveLength(0);
    });

    it("パターンがない場合は空配列を返す", () => {
      const yamlResponse = `
\`\`\`yaml
some_other_key: value
\`\`\`
`;

      const patterns = parseExtractResponse(yamlResponse);

      expect(patterns).toHaveLength(0);
    });

    it("オプショナルフィールドを含むパターンをパースする", () => {
      const yamlResponse = `
\`\`\`yaml
patterns:
  - name: フルパターン
    type: prompt
    context: コンテキスト
    problem: 問題の説明
    solution: 解決策
    example: 使用例
    example_prompt: プロンプト例
    tags: [full, example]
\`\`\`
`;

      const patterns = parseExtractResponse(yamlResponse);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].problem).toBe("問題の説明");
      expect(patterns[0].example).toBe("使用例");
      expect(patterns[0].example_prompt).toBe("プロンプト例");
    });
  });
});
