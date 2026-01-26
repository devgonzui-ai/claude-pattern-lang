# claude-pattern-lang

[![npm version](https://img.shields.io/npm/v/claude-pattern-lang)](https://www.npmjs.com/package/claude-pattern-lang)
[![License: MIT](https://img.shields.io/npm/l/claude-pattern-lang)](LICENSE)
[![Node: >=18.0.0](https://img.shields.io/node/v/claude-pattern-lang)](https://nodejs.org)

Claude Codeのセッションログから自動的にパターンを抽出・カタログ化するCLIツール。圧縮された知識をパターン・ランゲージとして管理し、以降のセッションでClaudeが参照・活用できるようにします。

## 概要

**claude-pattern-lang** はClaude Codeのセッションログを分析し、再利用可能なパターン—効果的なプロンプト構造、問題解決アプローチ、プロジェクト固有のイディオム—を特定します。抽出されたパターンは自動的にカタログ化され、`CLAUDE.md` に同期されることで、以降のセッションでClaudeが利用できるようになります。

### パターン・ランゲージとは？

- **圧縮された知識**: パターン名だけで複雑なコンテキストを効率的に伝達
- **再利用可能な解決策**: 効果的なアプローチを将来のセッションでも活用
- **コンテキスト効率**: LLMのコンテキストウィンドウを最大限に活用
- **自動発見**: 手動でのドキュメント作成は不要

## 機能

- **自動パターン抽出**: LLMによるセッションログの分析
- **パターンカタログ管理**: YAML形式での保存・整理
- **CLAUDE.md同期**: Claudeのコンテキストに自動統合
- **Claude Codeフック連携**: セッションライフサイクルとシームレスに統合
- **重複検出**: 自動重複排除とマージ
- **プライバシー保護**: 機密情報の自動マスキング
- **増分解析**: 前回解析以降の新しいセッションのみを対象に処理
- **マルチLLM対応**: Claude Code, GLM (Zhipu)
  - *他のプロバイダ（Anthropic, OpenAI, Gemini, Ollama, DeepSeek）は将来のリリースで対応予定*

## インストール

### グローバルインストール

```bash
npm install -g claude-pattern-lang
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

### パターン管理

パターンを手動で追加・削除します：

```bash
# 対話的にパターンを追加
cpl add

# YAMLファイルから追加
cpl add --file pattern.yaml

# パターンを削除
cpl remove <pattern-name>
```

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
  # LLMプロバイダ: claude-code | zhipu
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
├── prompts/              # カスタムプロンプトテンプレート
│   └── extract.txt
└── cache/
    ├── sessions.yaml     # 解析済みセッションキャッシュ
    └── queue.yaml        # 解析キュー
```

プロジェクト固有の構成（オプション）：

```
{project}/
├── .claude/
│   └── patterns.yaml     # プロジェクト固有パターン
└── CLAUDE.md             # パターンセクションが追加される
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
