# @gonzui/claude-pattern-lang

[![npm](https://img.shields.io/npm/v/@gonzui/claude-pattern-lang?label=npm&color=blue)](https://www.npmjs.com/package/@gonzui/claude-pattern-lang)
[![License: MIT](https://img.shields.io/npm/l/@gonzui/claude-pattern-lang?label=license&color=blue)](LICENSE)
[![Node: >=18.0.0](https://img.shields.io/node/v/@gonzui/claude-pattern-lang?label=node&color=blue)](https://nodejs.org)

日本語 | [English](README.md)

Claude Codeのセッションログから自動的にパターンを抽出・カタログ化するCLIツール。効果的なアプローチをパターン・ランゲージとして蓄積し、以降のセッションでClaudeが参照することで、タスク完了の高速化とコード品質の一貫性向上を実現します。

## 概要

**claude-pattern-lang** はClaude Codeのセッションログを分析し、再利用可能なパターン—効果的なプロンプト構造、問題解決アプローチ、プロジェクト固有のイディオム—を特定します。抽出されたパターンは自動的にカタログ化され、`CLAUDE.md` に同期されることで、以降のセッションでClaudeが利用できるようになります。

### パターン・ランゲージとは？

- **タスク完了の高速化**: パターンがClaudeを正解に直接導き、会話ターン数を約35%削減
- **コード品質の一貫性**: テンプレートにより統一されたコーディングスタイルを実現、コード量を約44%削減
- **再利用可能な解決策**: 効果的なアプローチを将来のセッションでも活用
- **自動発見**: 手動でのドキュメント作成は不要

> **検証結果**: テストでは、パターンありのプロジェクトでAPI実装タスクが9ターンで完了（パターンなしは14ターン）。生成コードも39行の一貫した実装 vs 69行のアドホックな実装という結果に。詳細は[検証レポート](docs/validation-report-patterns-effect.ja.md)を参照。

## 機能

- **自動パターン抽出**: LLMによるセッションログの分析
- **パターンカタログ管理**: YAML形式での保存・整理
- **CLAUDE.md同期**: Claudeのコンテキストに自動統合
- **Claude Codeフック連携**: セッションライフサイクルとシームレスに統合
- **重複検出**: 自動重複排除とマージ
- **プライバシー保護**: 機密情報の自動マスキング
- **増分解析**: 前回解析以降の新しいセッションのみを対象に処理
- **マルチLLM対応**: Claude Code
  - *他のプロバイダ（Anthropic, OpenAI, Gemini, Ollama, DeepSeek）は将来のリリースで対応予定*

## インストール

### グローバルインストール

```bash
npm install -g @gonzui/claude-pattern-lang
```

### ローカルインストール

```bash
npm install
npm run build
```

### 動作環境

- Node.js >= 18.0.0
- macOS, Linux, または Windows (WSL対応)

## 使い方

### 初期化

初回セットアップを行います：

```bash
cpl init
```

設定ディレクトリを作成し、Claude Codeのフックをインストールします。

### セッション解析

セッションログからパターンを抽出します：

```bash
# 最近のセッションをすべて解析
cpl analyze

# 特定のセッションを解析
cpl analyze --session <session-id>

# 指定日以降のセッションを解析
cpl analyze --since 2024-01-01

# 特定プロジェクトのセッションを解析
cpl analyze --project /path/to/project
```

> **Note**: `analyze`コマンドはセッションごとにLLM APIを呼び出してパターンを抽出します。解析するセッション数が多いほどトークン消費量が増加します。使用量は`cpl metrics`で確認できます。

### パターン一覧

パターンカタログを閲覧します：

```bash
# すべてのパターンを表示
cpl list

# タイプでフィルタ
cpl list --type prompt

# キーワード検索
cpl list --search "error handling"

# JSON形式で出力
cpl list --json
```

### パターン詳細表示

特定のパターンを表示します：

```bash
cpl show <pattern-name>
```

### CLAUDE.md への同期

カタログ化されたパターンをプロジェクトのCLAUDE.mdに反映します：

```bash
# 現在のプロジェクトに同期
cpl sync

# 特定プロジェクトに同期
cpl sync --project /path/to/project

# 変更をプレビュー（書き込みなし）
cpl sync --dry-run

# グローバルCLAUDE.mdに同期
cpl sync --global
```

#### sync の仕組み

`sync` コマンドは2つのファイルを生成します：

1. **patterns.md** - 実際のパターン内容を含む
   - プロジェクトローカル: `{project}/.claude/patterns.md`
   - グローバル (`--global`): `~/.claude-patterns/patterns.md`

2. **CLAUDE.md** - patterns.mdへの `@` 参照を含む
   ```markdown
   <!-- CPL:PATTERNS:START -->
   @.claude/patterns.md
   <!-- CPL:PATTERNS:END -->
   ```

このアプローチにより、CLAUDE.mdがスッキリし、パターンを独立して管理できます。Claude Codeの `@` インポート機能がパターン内容を自動的に読み込みます。

### パターン管理

パターンを手動で追加・削除します：

```bash
# 対話的にパターンを追加
cpl add

# 対話的にパターンを作成（add -i のエイリアス）
cpl create

# YAMLファイルから追加
cpl add --file pattern.yaml

# パターンを削除
cpl remove <pattern-name>
```

### 分析・統計

目的の異なる2つの分析コマンドがあります：

#### `cpl session` - Claude Codeセッション分析

**Claude Codeの会話ログ**からトークン使用量を分析します。セッションでのコンテキスト効率を把握するのに使います。

```bash
# 現在のプロジェクトの最新セッションを分析
cpl session

# 現在のプロジェクトの全セッションを分析
cpl session --all

# 特定プロジェクトのセッションを分析
cpl session --project /path/to/project

# 特定のセッションファイルを分析
cpl session ~/.claude/projects/.../session-id.jsonl
```

**出力内容：**
- メッセージ数（会話ターン数）
- 入力/出力トークン
- キャッシュ作成/読み取りトークン
- キャッシュ効率（%）

#### `cpl metrics` - cplツール使用統計

**cplツール自体**の使用統計を記録します（`cpl analyze`実行時など）。パターン抽出活動をモニタリングするのに使います。

```bash
# メトリクス履歴と統計を表示
cpl metrics

# 統計のみ表示
cpl metrics --stats

# 過去30日間の統計を表示
cpl metrics --days 30

# メトリクスをクリア
cpl metrics --clear
```

**主な違い：**

| 観点 | `cpl session` | `cpl metrics` |
|------|---------------|---------------|
| **対象** | Claude Codeの会話 | cplツールの使用 |
| **データソース** | `~/.claude/projects/**/*.jsonl` | `~/.claude-patterns/metrics.yaml` |
| **用途** | セッション効率の分析 | パターン抽出活動の追跡 |
| **追跡するトークン** | Claude CodeのLLM呼び出し | cplのLLM呼び出し（analyze時） |

## パターンタイプ

### プロンプトパターン (`prompt`)

効果的なプロンプト構造とテクニック：

- 良い結果を引き出す特定の言い回し
- 複雑なリクエストのためのフレームワーク構造
- コンテキスト設定のパターン

### 問題解決パターン (`solution`)

再利用可能な問題解決アプローチ：

- デバッグ・調査手順
- 一般的な問題の解決方法
- アーキテクチャ決定パターン

### コードパターン (`code`)

プロジェクト固有のコーディングイディオム：

- 繰り返し使われるコード構造
- テンプレートの慣習
- フレームワーク固有のパターン

## 設定

設定ファイルは `~/.claude-patterns/config.yaml` にあります：

```yaml
version: 1

llm:
  # LLMプロバイダ: claude-code
  # (他のプロバイダは将来のリリースで対応予定)
  provider: claude-code
  # 使用するモデル
  model: claude-opus-4-20250514
  # APIキーの環境変数名 (claude-codeは不要)
  api_key_env: ""

analysis:
  # セッション終了時に自動解析
  auto_analyze: false
  # 解析対象の最小メッセージ数
  min_session_length: 5
  # 除外するパターン (glob)
  exclude_patterns: []

sync:
  # 解析後に自動でCLAUDE.mdに同期
  auto_sync: false
  # 同期対象プロジェクト (glob)
  target_projects: []
```

## ディレクトリ構成

インストール後、以下の構造が作成されます：

```
~/.claude-patterns/
├── config.yaml           # グローバル設定
├── patterns.yaml         # パターンカタログ
├── patterns.md           # 同期されたパターン（グローバル、--global sync用）
├── prompts/              # カスタムプロンプトテンプレート
│   └── extract.txt
└── cache/
    ├── sessions.yaml     # 解析済みセッションキャッシュ
    └── queue.yaml        # 解析キュー
```

プロジェクト固有の構成（`cpl sync` 実行後）：

```
{project}/
├── .claude/
│   ├── patterns.yaml     # プロジェクト固有パターン（オプション）
│   └── patterns.md       # 同期されたパターン（CLAUDE.mdから参照）
└── CLAUDE.md             # @.claude/patterns.md への参照を含む
```

## 開発

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/claude-pattern-lang.git
cd claude-pattern-lang

# 依存関係をインストール
npm install

# ビルド
npm run build

# テスト実行
npm test
```

### スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run build` | プロジェクトをビルド |
| `npm run dev` | ウォッチモードでビルド |
| `npm run lint` | リント実行 |
| `npm run lint:fix` | リント問題を自動修正 |
| `npm run format` | Prettierでコード整形 |
| `npm run format:check` | コードフォーマットをチェック |
| `npm test` | ユニットテスト実行 |
| `npm run test:run` | テストを一度だけ実行 |
| `npm run test:e2e` | E2Eテスト実行 |
| `npm run test:all` | すべてのテストを実行 |
| `npm run typecheck` | TypeScript型チェックを実行 |

### 技術スタック

- **ランタイム**: Node.js 18+ with TypeScript
- **CLI**: [commander.js](https://www.npmjs.com/package/commander)
- **LLM SDK**: @anthropic-ai/sdk, openai, ollama
- **YAML**: js-yaml
- **テスト**: Vitest
- **ビルド**: tsup

## ライセンス

MIT © [Your Name]

---

詳細については、完全な仕様書を [spec.md](spec.md) で確認できます。
