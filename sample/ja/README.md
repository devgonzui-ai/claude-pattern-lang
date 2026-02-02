# サンプルパターン集

汎用的に使えるパターンのサンプル集です。

## ディレクトリ構造

```
sample/ja/
├── README.md                    # このファイル
├── coding-patterns.yaml        # コーディングのベストプラクティス
├── tool-usage-patterns.yaml    # Claude Codeでのツール使用
├── debugging-patterns.yaml     # デバッグ・トラブルシューティング
├── effective-prompts.yaml      # 効果的なプロンプトの書き方
└── architecture-patterns.yaml  # ソフトウェアアーキテクチャ
```

## カテゴリ

| ファイル | 説明 | パターン数 |
|---------|------|----------|
| `coding-patterns.yaml` | 型定義、エラーハンドリング、イミュータブル更新などのコーディングベストプラクティス | 8 |
| `tool-usage-patterns.yaml` | Read→Edit、検索→修正などのClaude Codeツール使用パターン | 8 |
| `debugging-patterns.yaml` | 体系的なエラー解決アプローチなどのデバッグ手法 | 6 |
| `effective-prompts.yaml` | コンテキスト提供、制約条件、例示などの効果的なプロンプト | 8 |
| `architecture-patterns.yaml` | Repository、Service、Factory、Middlewareなどのアーキテクチャパターン | 5 |

## 使い方

1. **参照** - パターンファイルを開いて、同様の状況に適用する
2. **保存** - プロジェクト固有のパターンとして保存して再利用する
3. **共有** - チームで共有してコーディング標準として使う

## パターン構造

各パターンは以下のフィールドを持ちます：

| フィールド | 説明 |
|----------|------|
| `id` | **一意識別子**（IDベースでsyncするため必須） |
| `name` | パターン名（人間が読むための表示名） |
| `type` | パターンタイプ（`prompt` / `solution` / `code`） |
| `context` | 使用する状況やシナリオ |
| `solution` | 解決策や手法 |
| `example` / `example_prompt` | 具体的な例 |
| `tags` | 検索用タグ |
| `notes` | 補足説明（任意） |

## ID命名規則

- 形式: `{lang}-{category}-{number}`
- `lang`: 言語コード（`ja` / `en`）
- `category`: カテゴリ（`coding` / `tool` / `debug` / `prompt` / `arch`）
- `number`: 3桁の連番（`001`、`002`、...）

例: `ja-coding-001`、`en-tool-003`

## パターンタイプ

### Prompt Patterns（`prompt`）
Claude Codeに指示を出す際の効果的なプロンプト構造：
- 特定のフレーズングで良い結果を引き出す
- 複雑なリクエストのフレームワーク構造
- コンテキスト設定のパターン

### Solution Patterns（`solution`）
再利用可能な問題解決アプローチ：
- デバッグ手順と調査方法
- 一般的な問題解決
- アーキテクチャ決定パターン

### Code Patterns（`code`）
プロジェクト固有のコーディングイディオム：
- 再発するコード構造
- テンプレートの規約
- フレームワーク固有のパターン

## 新しいパターンの追加

1. カテゴリに応じたファイルを選択
2. 既存のパターン構造に従って追加
3. 一意なIDを割り当てる
4. チームでレビュー

```yaml
patterns:
  - id: ja-coding-009          # 一意識別子（必須）
    name: パターン名            # 人間が読む表示名
    type: prompt | solution | code
    context: このパターンを使う状況
    solution: 問題の解決方法
    example: |
      コード例
    example_prompt: "プロンプト例"
    tags: [tag1, tag2, tag3]
    notes: 追加のコンテキスト（任意）
```

## パターンの例

### 変更前確認パターン（coding-patterns.yaml）

既存コードを修正する前に必ずReadツールでファイル内容を確認するパターンです。

```yaml
- id: ja-coding-001
  name: 変更前確認パターン
  type: prompt
  context: 既存コードを修正・削除・リファクタリングする場合
  solution: 変更前に必ずReadツールでファイル内容を確認させる
  example_prompt: "ファイルを読んでから修正して"
  tags: [coding, file-operation, safe-edit]
```

---

これらのサンプルパターンは、プロジェクト固有のパターンを作成する際の参考として使用できます。
